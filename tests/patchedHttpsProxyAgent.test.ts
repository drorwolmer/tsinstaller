import { rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import * as tls from "tls";
import {
  getRootCertificates,
  PatchedHttpsProxyAgent,
} from "../lib/patchedHttpsProxyAgent";

describe("Root ca tests", () => {
  const tmpCertFile = path.join(tmpdir(), "root-cert-test.pem");

  beforeEach(async () => {
    await writeFile(tmpCertFile, "test");
  });

  afterEach(async () => {
    await rm(tmpCertFile);
    jest.restoreAllMocks();
  });

  it("if no intercept, make sure no cert is read", async () => {
    const patchedHttpsProxyAgent = new PatchedHttpsProxyAgent({});

    // Hacky, make sure httpsAgent has not been monkey patched
    expect((patchedHttpsProxyAgent as any).ca).toBeUndefined();
  });

  it("if intercept, make sure cert is read", async () => {
    const ca = await getRootCertificates([tmpCertFile]);
    const patchedHttpsProxyAgent = new PatchedHttpsProxyAgent({
      ca: ca,
    });

    // Make sure that the proxy agent has the right config
    const actualCa = (patchedHttpsProxyAgent as any).ca as string[];
    // Make sure all the original certs have been used in the patched agent
    expect(actualCa.length).toBe(tls.rootCertificates.length + 1);
    expect(actualCa[actualCa.length - 1]).toEqual("test");
  });
});
