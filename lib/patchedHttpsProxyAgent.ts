import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent";
import * as tls from "tls";
import { Socket } from "net";
import { ClientRequest, RequestOptions } from "agent-base";
import { readFile } from "fs/promises";

// --------------------------------------------------------------------------------------
// We need to monkey patch HttpsProxyAgent to support adding custom root certificates
// at runtime. The other method is to use the NODE_EXTRA_CA_CERTS environment variable
// Which gets evaluated when program starts, but cannot be changed while running.
// --------------------------------------------------------------------------------------
// There is another problem with "https-proxy-agent" which is that it does not support
// All the parameters of RequestOptions. We need to manually pass the `ca` parameter
// if we want to add custom root certificates.
// --------------------------------------------------------------------------------------
// Based loosley on https://github.com/TooTallNate/node-https-proxy-agent/issues/89
// --------------------------------------------------------------------------------------
export class PatchedHttpsProxyAgent extends HttpsProxyAgent {
  private ca?: string | Buffer | (string | Buffer)[] | undefined;

  constructor(opts: HttpsProxyAgentOptions) {
    super(opts);
    this.ca = opts.ca;
  }

  async callback(req: ClientRequest, opts: RequestOptions): Promise<Socket> {
    return super.callback(req, Object.assign(opts, { ca: this.ca }));
  }
}

const areArraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// --------------------------------------------------------------------------------------
// This method will read the actual content of the extra certificates, and concatenate
// them with the existing certificates (bundled with Node).
// We use a cache because we only want to read the certificates once.
// We will read them again if the configuration changes
// --------------------------------------------------------------------------------------
let rootCertificatesFilePathsCache: string[] = [];
let rootCertificatesCache: string[] = [];
export const getRootCertificates = async (extraRootCertificates: string[]) => {
  const certificatesChanged = !areArraysEqual(
    rootCertificatesFilePathsCache,
    extraRootCertificates
  );

  if (certificatesChanged) {
    const extraRootCertificatesData = await Promise.all(
      extraRootCertificates.map((f) => readFile(f, "utf8"))
    );
    rootCertificatesFilePathsCache = extraRootCertificates;
    rootCertificatesCache = tls.rootCertificates.concat(
      extraRootCertificatesData
    );
  }

  return rootCertificatesCache;
};
