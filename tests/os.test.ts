import { verifyLinuxServiceEnabled } from "../lib/os";
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
});
