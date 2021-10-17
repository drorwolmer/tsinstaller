import { getUrlStatus, RequiredUrl, verifyAllUrls } from "../lib/network";
import { AxiosError } from "axios";

describe("URL tests", () => {
  it("getUrlStatus(https://google.com) returns 200", async () => {
    const status = await getUrlStatus("https://google.com");
    expect(status).toEqual(200);
  });

  it("getUrlStatus(https://google.com/NON_EXISTANT_SHIT) returns 404", async () => {
    const status = await getUrlStatus("https://google.com/NON_EXISTANT_SHIT");
    expect(status).toEqual(404);
  });

  it("getUrlStatus(https://mock.codes/403) returns 403", async () => {
    const status = await getUrlStatus("https://mock.codes/403");
    expect(status).toEqual(403);
  });

  it("getUrlStatus with bad host throws", async () => {
    let error;
    try {
      await getUrlStatus("https://NON-EXISTANT_HOST-420.co.il");
    } catch (e) {
      error = e as AxiosError;
    }
    if (!error) {
      fail("Should be error");
    }
    expect(error.code).toEqual("ENOTFOUND");
  });

  it("getUrlStatus with bad IP reaches timeout", async () => {
    let error;
    try {
      await getUrlStatus("https://10.4.20.240", 1);
    } catch (e) {
      error = e as AxiosError;
    }
    if (!error) {
      fail("Should be error");
    }
    expect(error.code).toEqual("ECONNABORTED");
  });

  it("verifyAllUrls checks all URLS", async () => {
    const requiredUrls: RequiredUrl[] = [
      {
        url: "https://auth.docker.io",
        expectedStatus: [404],
      },
      {
        url: "https://google.com",
        expectedStatus: [200],
      },
    ];

    const res = await verifyAllUrls(requiredUrls)();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.data).toEqual([
      {
        success: true,
        requiredUrl: requiredUrls[0],
        status: 404,
        text: "OK",
      },
      {
        success: true,
        requiredUrl: requiredUrls[1],
        status: 200,
        text: "OK",
      },
    ]);
  });

  it("verifyAllUrls checks all URLS. Bad code fails", async () => {
    const requiredUrls: RequiredUrl[] = [
      {
        // This guy is going to succeed (unless google goes down)
        url: "https://google.com",
        expectedStatus: [200],
      },
      {
        // This URL is going to fail, because it returns 404
        url: "https://auth.docker.io",
        expectedStatus: [200, 202],
      },
    ];

    const res = await verifyAllUrls(requiredUrls)();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("Failed validating network prerequisites");
    expect(res.data).toEqual([
      {
        success: true,
        requiredUrl: requiredUrls[0],
        status: 200,
        text: "OK",
      },
      {
        success: false,
        requiredUrl: requiredUrls[1],
        status: 404,
        text: "Wrong status code 404, expected one of [200,202]",
      },
    ]);
  });

  it("verifyAllUrls checks all URLS. Bad URL Problems", async () => {
    const requiredUrls: RequiredUrl[] = [
      {
        // Unreachable IP (Expecting a timeout)
        url: "https://10.1.2.3",
        expectedStatus: [404],
      },
      {
        url: "https://cannnotDNS.docker.io",
        expectedStatus: [404],
      },
      {
        url: "https://expired.badssl.com",
        expectedStatus: [404],
      },
      // This domain is always invalid now...
      // {
      //   url: "https://untrusted-root.badssl.com/",
      //   expectedStatus: [404],
      // },
    ];

    const res = await verifyAllUrls(requiredUrls)();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("Failed validating network prerequisites");
    expect(res.data).toEqual([
      {
        success: false,
        status: undefined,
        text: "Request timeout",
        requiredUrl: requiredUrls[0],
        axiosError: expect.anything(),
      },
      {
        success: false,
        status: undefined,
        text: "DNS lookup failed",
        requiredUrl: requiredUrls[1],
        axiosError: expect.anything(),
      },
      {
        success: false,
        status: undefined,
        text: "certificate has expired",
        requiredUrl: requiredUrls[2],
        axiosError: expect.anything(),
      },
      // {
      //   success: false,
      //   status: undefined,
      //   text: "self signed certificate in certificate chain",
      //   requiredUrl: requiredUrls[3],
      //   axiosError: expect.anything(),
      // },
    ]);
  });
});
