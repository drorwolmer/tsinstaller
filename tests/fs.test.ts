import { untar, verifyDiskSpace } from "../lib/fs";
import * as checkDiskSpace from "check-disk-space";
import * as os from "../lib/os";
import * as subprocess from "../lib/subprocess";

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
          free: 8 * 1024 * 1024 * 1024,
          size: 100 * 1024 * 1024 * 1024,
        };
      });

    const res = await verifyDiskSpace(10 * 1024 * 1024 * 1024)();
    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("Insufficient disk space");
    expect(res.errorDescription).toEqual(
      "Installer requires at least 10GB free"
    );
    expect(res.data).toEqual({
      availableGB: 8,
      diskSpace: { diskPath: "/", free: 8589934592, size: 107374182400 },
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
          free: 80 * 1024 * 1024 * 1024,
          size: 100 * 1024 * 1024 * 1024,
        };
      });

    const res = await verifyDiskSpace(20 * 1024 * 1024 * 1024)();
    expect(res.success).toBeTruthy();
    expect(res.data).toEqual({
      availableGB: 80,
      diskSpace: {
        diskPath: "/var/lib/docker",
        free: 85899345920,
        size: 107374182400,
      },
      requiredGB: 20,
    });
    expect(checkDiskSpaceMock).toBeCalledWith("/var/lib/docker");
    expect(getOsPlatformMock).toBeCalledTimes(1);
  });

  it("Should untar correctly", async () => {
    const spawnMock = jest
      .spyOn(subprocess, "spawnBashSelfExtractAsync")
      .mockImplementation(async () => {
        return {
          cmdline: "tar -vxf foo",
          status: 0,
          stderr: "",
          stdout: "foo\nbar\n",
        };
      });

    const res = await untar("foo", "/tmp/foo")();
    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.successDebug).toEqual("Extracted to /tmp/foo");
    expect(res.data).toEqual({
      cmdline: "tar -vxf foo",
      status: 0,
      stderr: "",
      stdout: "foo\nbar\n",
    });
    expect(spawnMock).toBeCalledWith("tar -xzvf", "foo", { cwd: "/tmp/foo" });
  });

  it("Fails if cannot untar", async () => {
    const spawnMock = jest
      .spyOn(subprocess, "spawnBashSelfExtractAsync")
      .mockImplementation(async () => {
        return {
          cmdline: "tar -vxf foo",
          status: 1,
          stderr: "Failed because of foo",
          stdout: "",
        };
      });

    const res = await untar("foo", "/tmp/foo")();
    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("Failed to extract archive");
    expect(res.errorDescription).toEqual("Failed because of foo");
    expect(res.data).toEqual({
      cmdline: "tar -vxf foo",
      status: 1,
      stderr: "Failed because of foo",
      stdout: "",
    });
    expect(spawnMock).toBeCalledWith("tar -xzvf", "foo", { cwd: "/tmp/foo" });
  });
});
