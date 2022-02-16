import axios, { AxiosError } from "axios";
import { InstallerStepFn } from "./types";
import { sleep, zip } from "./utils";
import Table from "cli-table";
import clc from "cli-color";
import { HttpsProxyAgentOptions } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { URL } from "url";
import * as net from "net";
import {
  getRootCertificates,
  PatchedHttpsProxyAgent,
} from "./patchedHttpsProxyAgent";

export const WEB_REQUEST_TIMEOUT_SECONDS = 3;
export type RequiredUrl = {
  url: string;
  expectedStatus: number[];
};

export type UrlResult = {
  requiredUrl: RequiredUrl;
  success: boolean;
  status?: number;
  text?: string;
  axiosError?: AxiosError;
};

export type GetUrlStatusConfig = {
  proxyUrl?: string;
  timeoutSeconds?: number;
  customRootCertificates?: string[];
};

export const getUrlStatus = async (
  url: string,
  config: GetUrlStatusConfig = {}
) => {
  const timeoutSeconds = config.timeoutSeconds || WEB_REQUEST_TIMEOUT_SECONDS;

  let httpProxyAgent: HttpProxyAgent | undefined = undefined;
  let httpsProxyAgent: PatchedHttpsProxyAgent | undefined = undefined;

  if (config.proxyUrl) {
    const parsedUrl = new URL(config.proxyUrl);

    const proxyAgentConfig: HttpsProxyAgentOptions = {
      protocol: parsedUrl.protocol,
      host: parsedUrl.hostname,
      port: parsedUrl.port,
      auth: parsedUrl.username
        ? parsedUrl.username + ":" + parsedUrl.password
        : undefined,
      timeout: timeoutSeconds * 1000,
    };

    if (config.customRootCertificates) {
      proxyAgentConfig.ca = await getRootCertificates(
        config.customRootCertificates
      );
    }

    httpProxyAgent = new HttpProxyAgent(proxyAgentConfig);
    httpsProxyAgent = new PatchedHttpsProxyAgent(proxyAgentConfig);
  }

  const res = await axios.get(url, {
    timeout: timeoutSeconds * 1000,
    validateStatus: (s) => true, // Do not fail if status is > 4xx
    httpAgent: httpProxyAgent,
    httpsAgent: httpsProxyAgent,
  });

  return res.status;
};

export const getPortFromUrl = (url: string) => {
  let port = new URL(url).port;
  if (port === "" && url.startsWith("https://")) {
    return 443;
  }
  if (port === "" && url.startsWith("http://")) {
    return 80;
  }
  return parseInt(port);
};

export const verifyProxyConnection = async (
  proxyUrl: string,
  timeoutSeconds: number = WEB_REQUEST_TIMEOUT_SECONDS
) => {
  const port = getPortFromUrl(proxyUrl);
  const host = new URL(proxyUrl).hostname;
  const promise = new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();

    const onError = (err: any) => {
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(timeoutSeconds * 1000);
    socket.once("error", onError);
    socket.once("timeout", () => {
      onError({
        code: "ETIMEOUT",
        message: `Timed out after ${timeoutSeconds} seconds`,
      });
    });

    socket.connect(port, host, () => {
      socket.end();
      resolve();
    });
  });
  return promise;
};

export const verifyAllUrls =
  (
    requiredUrls: RequiredUrl[],
    config: GetUrlStatusConfig = {}
  ): InstallerStepFn<UrlResult[]> =>
  async () => {
    if (config.proxyUrl) {
      try {
        await verifyProxyConnection(
          config.proxyUrl,
          config.timeoutSeconds || WEB_REQUEST_TIMEOUT_SECONDS
        );
      } catch (error) {
        let errorDescription = (error as Error).message;
        if ((error as NodeJS.ErrnoException).code === "ECONNREFUSED") {
          errorDescription = `Connection refused to proxy ${config.proxyUrl}`;
        } else if ((error as NodeJS.ErrnoException).code === "ETIMEOUT") {
          errorDescription = `Timed out connecting to proxy ${config.proxyUrl}`;
        }
        return {
          success: false,
          errorTitle: "Failed to connect to proxy",
          errorDescription: errorDescription,
        };
      }
    }

    const data: UrlResult[] = [];
    const promisesResults = await Promise.allSettled(
      requiredUrls.map(({ url }) => getUrlStatus(url, config))
    );

    let successFlag = true;

    for (const [requiredUrl, promise] of zip(requiredUrls, promisesResults)) {
      if (promise.status === "rejected") {
        successFlag = false;

        let axiosError: AxiosError | undefined;
        let text: string | undefined;

        if (axios.isAxiosError(promise.reason)) {
          axiosError = promise.reason as AxiosError;

          if (axiosError.code === "ECONNABORTED") {
            text = "Request timeout";
          } else if (axiosError.code === "ENOTFOUND") {
            text = "DNS lookup failed";
          } else if (axiosError.code === "CERT_HAS_EXPIRED") {
            text = axiosError.message;
          } else if (axiosError.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
            text = "SSL error: " + axiosError.message;
          } else if (
            config.proxyUrl &&
            axiosError.request?._currentRequest?.res?.statusCode
          ) {
            // REALLY HACKY STUFF
            const proxyStatusCode: number | undefined =
              axiosError.request?._currentRequest?.res?.statusCode;
            if (proxyStatusCode === 407) {
              text = "407 Proxy Authentication Required";
            }
          } else {
            text = axiosError.message;
          }
        }

        data.push({
          success: false,
          requiredUrl,
          status: undefined,
          text: text,
          axiosError,
        });
        continue;
      }

      if (requiredUrl.expectedStatus.indexOf(promise.value) > -1) {
        data.push({
          success: true,
          requiredUrl,
          status: promise.value,
          text: "OK",
        });
      } else if (requiredUrl.expectedStatus.indexOf(promise.value) === -1) {
        successFlag = false;
        data.push({
          success: false,
          requiredUrl,
          status: promise.value,
          text: `Wrong status code ${promise.value}, expected one of [${requiredUrl.expectedStatus}]`,
        });
      }
    }

    const table = new Table({
      head: ["URL", "status"],
      style: { head: ["bold"] },
      chars: {
        top: "-",
        "top-mid": "-",
        "top-left": ".",
        "top-right": ".",
        bottom: "-",
        "bottom-mid": "-",
        "bottom-left": "'",
        "bottom-right": "'",
        left: "|",
        "left-mid": "|",
        mid: "-",
        "mid-mid": "+",
        right: "|",
        "right-mid": "|",
        middle: "|",
      },
    });

    // We dont want to sort in place, so we create a copy of the array
    [...data]
      .sort((a, b) => `${a.success}`.localeCompare(`${b.success}`))
      .forEach((v) => {
        table.push([
          v.requiredUrl.url,
          v.success ? clc.green(v.text) : clc.bold(clc.red(v.text)),
        ]);
      });

    if (successFlag) {
      return {
        success: true,
        successText: "OK",
        successDebug: table.toString(),
        data,
      };
    }

    return {
      success: false,
      data,
      errorTitle: "Failed validating network prerequisites",
      errorDescription: table.toString(),
    };
  };

export const verifyUrlReady =
  (
    url: string,
    timeoutSeconds: number
  ): InstallerStepFn<UrlResult | undefined> =>
  async (spinner) => {
    const startTime = new Date();
    let urlResult: UrlResult | undefined = undefined;
    while (true) {
      const elapsedSeconds =
        (new Date().getTime() - startTime.getTime()) / 1000;

      if (elapsedSeconds > timeoutSeconds) {
        return {
          success: false,
          errorTitle: `Timed out waiting for ${url}`,
          errorDescription: `Waited for ${timeoutSeconds} seconds`,
          data: urlResult,
        };
      }

      const res = await verifyAllUrls([
        {
          url,
          expectedStatus: [200],
        },
      ])();

      if (res.data) {
        urlResult = res.data[0];
      }

      if (res.success) {
        return {
          success: true,
          data: urlResult,
          successText: "OK",
        };
      }

      await sleep(2000);
    }
  };
