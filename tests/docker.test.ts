import { getDockerComposeVersion, getDockerVersion } from "../lib/docker";
import * as docker from "../lib/docker";
import * as semver from "semver";
import * as subprocess from "../lib/subprocess";

describe("Docker tests", () => {
  it("Gets correct docker version [with leading 0]", async () => {
    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          stdout: "19.03.1\n",
          status: 0,
          stderr: "",
          cmdline: "",
        };
      });

    const dockerVersion = await getDockerVersion();

    spawnAsyncMock.mockRestore();
    expect(dockerVersion).toEqual("19.3.1");
  });

  it("Gets correct docker-compose version [with leading 0]", async () => {
    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          stdout: "1.02.01,\n",
          status: 0,
          stderr: "",
          cmdline: "",
        };
      });

    const dockerComposeVersion = await getDockerComposeVersion();
    spawnAsyncMock.mockRestore();
    expect(dockerComposeVersion).toEqual("1.2.1");
  });

  it("Gets correct docker-compose version", async () => {
    const dockerComposeVersion = await getDockerComposeVersion();
    expect(semver.gt(dockerComposeVersion, "1.29.1")).toBeTruthy();
  });

  it("Succeeds if docker version is OK", async () => {
    const getDockerVersionMock = jest
      .spyOn(docker, "getDockerVersion")
      .mockImplementation(async () => "20.10.7");
    const res = await docker.verifyDockerVersion("20.10.7")();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("20.10.7");
    expect(getDockerVersionMock).toBeCalled();
  });

  it("Succeeds if docker-compose version is OK", async () => {
    const getDockerVersionMock = jest
      .spyOn(docker, "getDockerComposeVersion")
      .mockImplementation(async () => "1.29.3");

    const res = await docker.verifyDockerComposeVersion("1.29.2")();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("1.29.3");
    expect(getDockerVersionMock).toBeCalled();
  });

  it("Fails if docker version is too low", async () => {
    const getDockerVersionMock = jest
      .spyOn(docker, "getDockerVersion")
      .mockImplementation(async () => "0.1.2");

    const res = await docker.verifyDockerVersion("20.10.7")();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual(
      "Docker version 0.1.2 is lower then min version 20.10.7"
    );
    expect(getDockerVersionMock).toBeCalled();
  });

  it("Fails if docker-compose version is too low", async () => {
    const getDockerVersionMock = jest
      .spyOn(docker, "getDockerComposeVersion")
      .mockImplementation(async () => "1.2.3");

    const res = await docker.verifyDockerComposeVersion("1.29.2")();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual(
      "docker-compose version 1.2.3 is lower then min version 1.29.2"
    );
    expect(getDockerVersionMock).toBeCalled();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
});
