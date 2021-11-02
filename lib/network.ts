import axios, { AxiosError } from "axios";
import { InstallerStepFn } from "./types";
import { sleep, zip } from "./utils";
import Table from "cli-table";
import clc from "cli-color";
import httpsProxyAgent from "https-proxy-agent"

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

export const getUrlStatus = async (
  url: string,
  timeoutSeconds = WEB_REQUEST_TIMEOUT_SECONDS,
  proxyUrl?: string,
  ) => {

  let agent = undefined;
  if (proxyUrl != null) {
    agent = httpsProxyAgent(proxyUrl);
  }
  const res = await axios.get(url, {
    timeout: timeoutSeconds * 1000,
    validateStatus: (s) => true, // Do not fail if status is > 4xx
    httpsAgent: agent
  });
   
  return res.status;
};

export const verifyAllUrls =
  (
    requiredUrls: RequiredUrl[],
    timeoutSeconds = WEB_REQUEST_TIMEOUT_SECONDS,
    proxyUrl?: string
  ): InstallerStepFn<UrlResult[]> =>
  async () => {
    const data: UrlResult[] = [];
    const promisesResults = await Promise.allSettled(
      requiredUrls.map(({ url }) => getUrlStatus(url, timeoutSeconds, proxyUrl)));

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
