import { verifyLinuxServiceEnabled, verifyMinCpuRequirements, verifyMinMemoryRequirements } from "../lib/os";
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
    const getOsCpusMock = jest
      .spyOn(os, "cpuCores")
      .mockReturnValue(6);

    const res = await verifyMinCpuRequirements(8)();
    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("This system does not meet minimum requirements");
    expect(getOsCpusMock).toBeCalled();
  });

  it("Fails if memory count doesn't meet requirements", async () => {
    const getMemoryMock = jest
      .spyOn(os, "totalMemoryInBytes")
      .mockReturnValue(6);

    const res = await verifyMinMemoryRequirements(8)();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("This system does not meet minimum requirements");
    expect(getMemoryMock).toBeCalled();
  });

  it("Succeeds if cpu count meet requirements", async () => {
    const getOsCpusMock = jest
      .spyOn(os, "cpuCores")
      .mockReturnValue(10);

    const res = await verifyMinCpuRequirements(8)();
    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(getOsCpusMock).toBeCalled();
  });

  it("Succeeds if memory count meet requirements", async () => {
    const getMemoryMock = jest
      .spyOn(os, "totalMemoryInBytes")
      .mockReturnValue(10);

    const res = await verifyMinMemoryRequirements(8)();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(getMemoryMock).toBeCalled();
  });


});
