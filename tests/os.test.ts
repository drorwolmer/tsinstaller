import {
  verifyLinuxServiceEnabled,
  verifyMinCpuRequirements,
  verifyMinMemoryRequirements,
} from "../lib/os";
import * as subprocess from "../lib/subprocess";
import * as os from "../lib/os";

describe("OS TESTS", () => {
  it("Skips verifyDockerServiceEnabled if not Linux", async () => {
    const getOsPlatformMock = jest
      .spyOn(os, "getOsPlatform")
      .mockReturnValue("darwin");

    const res = await verifyLinuxServiceEnabled("docker")();

    expect(res.success).toBeTruthy();
    expect(res.successDebug).toEqual("Skipping test because not Linux");
    expect(getOsPlatformMock).toBeCalled();
  });

  it("Fails if docker service is not found", async () => {
    const getOsPlatformMock = jest
      .spyOn(os, "getOsPlatform")
      .mockReturnValue("linux");

    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          stdout: "",
          status: 1,
          stderr:
            "Failed to get unit file state for docker.service: No such file or directory\n",
          cmdline: "systemctl is-enabled docker",
        };
      });

    const res = await verifyLinuxServiceEnabled("docker")();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("service docker is not enabled");
    expect(res.errorDescription).toEqual(
      "Failed to get unit file state for docker.service: No such file or directory"
    );
    expect(getOsPlatformMock).toBeCalled();
    expect(spawnAsyncMock).toBeCalled();
  });

  it("Fails if docker service is not enabled", async () => {
    const getOsPlatformMock = jest
      .spyOn(os, "getOsPlatform")
      .mockReturnValue("linux");

    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          stdout: "disabled\n",
          status: 1,
          stderr: "",
          cmdline: "systemctl is-enabled docker",
        };
      });

    const res = await verifyLinuxServiceEnabled("docker")();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("service docker is not enabled");
    expect(res.errorDescription).toEqual(
      "service docker is disabled. Enable it using [systemctl enable --now docker]"
    );
    expect(getOsPlatformMock).toBeCalled();
    expect(spawnAsyncMock).toBeCalled();
  });

  it("Verifies root succeeds when root", async () => {
    const isRootMock = jest.spyOn(os, "isRoot").mockReturnValue(true);

    const res = await os.verifyRoot();

    expect(res.success).toBeTruthy();
    expect(isRootMock).toBeCalled();
  });

  it("Verifies root fails when not root", async () => {
    const isRootMock = jest.spyOn(os, "isRoot").mockReturnValue(false);

    const res = await os.verifyRoot();

    expect(res.success).toBeFalsy();
    expect(isRootMock).toBeCalled();
  });

  it("Succeeds if docker service is not enabled", async () => {
    const getOsPlatformMock = jest
      .spyOn(os, "getOsPlatform")
      .mockReturnValue("linux");

    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          stdout: "enabled\n",
          status: 0,
          stderr: "",
          cmdline: "systemctl is-enabled docker",
        };
      });

    const res = await verifyLinuxServiceEnabled("docker")();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(getOsPlatformMock).toBeCalled();
    expect(spawnAsyncMock).toBeCalled();
  });

  it("Fails if cpu count doesn't meet requirements", async () => {
    const getOsCpusMock = jest.spyOn(os, "getTotalCpuCores").mockReturnValue(6);

    const res = await verifyMinCpuRequirements(8)();
    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual(
      "This system does not meet minimum requirements"
    );
    expect(res.data).toEqual({ cpuCores: 6, minCpuCores: 8 });

    expect(getOsCpusMock).toBeCalled();
  });

  it("Fails if memory count doesn't meet requirements", async () => {
    // Mock it so we have only 4GB of memory
    const getMemoryMock = jest
      .spyOn(os, "getTotalMemory")
      .mockReturnValue(4 * 1024 * 1024 * 1024);

    // Require 8GB of memory
    const res = await verifyMinMemoryRequirements(8 * 1024 * 1024 * 1024)();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual(
      "This system does not meet minimum requirements"
    );
    expect(res.data).toEqual({
      minMemoryBytes: 8589934592,
      minMemoryMB: 8192,
      totalMemory: 4294967296,
      totalMemoryMb: 4096,
    });
    expect(getMemoryMock).toBeCalled();
  });

  it("Succeeds if cpu count meet requirements", async () => {
    const getOsCpusMock = jest
      .spyOn(os, "getTotalCpuCores")
      .mockReturnValue(10);

    const res = await verifyMinCpuRequirements(8)();
    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.data).toEqual({ cpuCores: 10, minCpuCores: 8 });
    expect(getOsCpusMock).toBeCalled();
  });

  it("Succeeds if memory count meet requirements", async () => {
    const getMemoryMock = jest
      .spyOn(os, "getTotalMemory")
      .mockReturnValue(10 * 1024 * 1024 * 1024);

    // Require 4GB of memory
    const res = await verifyMinMemoryRequirements(4 * 1024 * 1024 * 1024)();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.data).toEqual({
      minMemoryBytes: 4294967296,
      minMemoryMB: 4096,
      totalMemory: 10737418240,
      totalMemoryMb: 10240,
    });
    expect(getMemoryMock).toBeCalled();
  });
});
