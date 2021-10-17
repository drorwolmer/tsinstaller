import { verifyDiskSpace } from "../lib/fs";
import * as checkDiskSpace from "check-disk-space";
import * as os from "../lib/os";

describe("fs tests", () => {
  it("Should fail when insufficient space", async () => {
    const getOsPlatformMock = jest
      .spyOn(os, "getOsPlatform")
      .mockReturnValue("win32");

    const checkDiskSpaceMock = jest
      .spyOn(checkDiskSpace, "default")
      .mockImplementation(async (...args) => {
        return {
          diskPath: args[0],
          free: 8 * 1024 * 1024,
          size: 100 * 1024 * 1024,
        };
      });

    const res = await verifyDiskSpace(10 * 1024 * 1024)();
    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("Insufficient disk space");
    expect(res.errorDescription).toEqual(
      "Installer requires at least 10GB free"
    );
    expect(res.data).toEqual({
      availableGB: 8,
      diskSpace: { diskPath: "/", free: 8388608, size: 104857600 },
      requiredGB: 10,
    });
    expect(checkDiskSpaceMock).toBeCalledWith("/");
    expect(getOsPlatformMock).toBeCalledTimes(1);
  });

  it("Should succeed when sufficient space", async () => {
    const getOsPlatformMock = jest
      .spyOn(os, "getOsPlatform")
      .mockReturnValue("linux");

    const checkDiskSpaceMock = jest
      .spyOn(checkDiskSpace, "default")
      .mockImplementation(async (...args) => {
        return {
          diskPath: args[0],
          free: 80 * 1024 * 1024,
          size: 100 * 1024 * 1024,
        };
      });

    const res = await verifyDiskSpace(20 * 1024 * 1024)();
    expect(res.success).toBeTruthy();
    expect(res.data).toEqual({
      availableGB: 80,
      diskSpace: {
        diskPath: "/var/lib/docker",
        free: 83886080,
        size: 104857600,
      },
      requiredGB: 20,
    });
    expect(checkDiskSpaceMock).toBeCalledWith("/var/lib/docker");
    expect(getOsPlatformMock).toBeCalledTimes(1);
  });
});
