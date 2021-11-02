import {
  getUrlStatus,
  RequiredUrl,
  UrlResult,
  verifyAllUrls,
  verifyUrlReady,
} from "../lib/network";
import * as network from "../lib/network";
import axios, { AxiosError } from "axios";

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
      {
        url: "https://untrusted-root.badssl.com/",
        expectedStatus: [404],
      },
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
      {
        success: false,
        status: undefined,
        text: "self signed certificate in certificate chain",
        requiredUrl: requiredUrls[3],
        axiosError: expect.anything(),
      },
    ]);
  });

  it("verifyUrlReady succeeds if URL returns 200", async () => {
    const res = await verifyUrlReady("https://google.com", 3)();
    expect(res).toEqual({
      success: true,
      data: {
        success: true,
        requiredUrl: { url: "https://google.com", expectedStatus: [200] },
        status: 200,
        text: "OK",
      },
      successText: "OK",
    });
  });

  it("verifyUrlReady fails if timeout elapsed", async () => {
    const verifyAllUrlsMock = jest
      .spyOn(network, "verifyAllUrls")
      .mockImplementation(
        () => () =>
          Promise.resolve({
            success: false,
            data: [
              {
                requiredUrl: {
                  url: "https://1.4.2.2",
                  expectedStatus: [200],
                },
                success: false,
                text: "something broke",
              },
            ],
          })
      );

    const res = await verifyUrlReady("https://1.4.2.2", 1)();
    expect(res).toEqual({
      success: false,
      data: {
        success: false,
        requiredUrl: { url: "https://1.4.2.2", expectedStatus: [200] },
        text: "something broke",
      },
      errorDescription: "Waited for 1 seconds",
      errorTitle: "Timed out waiting for https://1.4.2.2",
    });

    expect(verifyAllUrlsMock).toBeCalledTimes(1);
  });

  it("verifyUrlReady retries", async () => {
    let i = 0;
    const verifyAllUrlsMock = jest
      .spyOn(network, "verifyAllUrls")
      .mockImplementation(() => () => {
        i += 1;
        if (i === 1) {
          return Promise.resolve({
            success: false,
            data: [
              {
                requiredUrl: {
                  url: "https://1.4.2.2",
                  expectedStatus: [200],
                },
                success: false,
                text: "something broke",
              },
            ],
          });
        } else {
          return Promise.resolve({
            success: true,
            data: [
              {
                requiredUrl: {
                  url: "https://1.4.2.2",
                  expectedStatus: [200],
                },
                success: true,
                text: "OK",
              },
            ],
          });
        }
      });

    const res = await verifyUrlReady("https://1.4.2.2", 3)();
    expect(res).toEqual({
      success: true,
      data: {
        success: true,
        requiredUrl: { url: "https://1.4.2.2", expectedStatus: [200] },
        text: "OK",
      },
      successText: "OK",
    });

    expect(verifyAllUrlsMock).toBeCalledTimes(2);
  });
  
  it("verifyAllUrls checks all URLS with proxy", async () => {
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

    const verifyAllUrlsMock = jest
    .spyOn(network, "verifyAllUrls")
    .mockImplementation(
      () => () =>
        Promise.resolve({
          success: true,
          data: [
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
          ]
        })
    );
  

    const res = await verifyAllUrls(requiredUrls,undefined,"http://@localhost:1234")();
    expect(res.success).toBeTruthy();
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
    expect(verifyAllUrlsMock).toBeCalledTimes(1);
  });

  it("verifyAllUrls checks all URLS with proxy fails", async () => {
    const requiredUrls: RequiredUrl[] = [
      {
        url: "https://auth.docker.io",
        expectedStatus: [404],
      }
    ];

    const verifyAllUrlsMock = jest
    .spyOn(network, "verifyAllUrls")
    .mockImplementation(
      () => () =>
        Promise.resolve({
          success: false,
          data: [
            {
              success: false,
              requiredUrl: requiredUrls[0],
              status: 404,
              text: "something broke",
            },
          ]
        })
    );
  

    const res = await verifyAllUrls(requiredUrls,undefined,"http://@localhost:1234")();
    expect(res.success).toBeFalsy();
    expect(res.data).toEqual([
      {
        success: false,
        requiredUrl: requiredUrls[0],
        status: 404,
        text: "something broke",
      }
    ]);
    expect(verifyAllUrlsMock).toBeCalledTimes(1);
  });

  
});
