import {
  dockerComposeUp,
  getDockerComposeVersion,
  getDockerVersion,
} from "../lib/docker";
import * as docker from "../lib/docker";
import * as semver from "semver";
import * as subprocess from "../lib/subprocess";

describe("Docker tests", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

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
    expect(spawnAsyncMock).toHaveBeenCalledWith("docker-compose", [
      "version",
      "--short",
    ]);
    expect(dockerComposeVersion).toEqual("1.2.1");
  });

  it("Gets correct docker-compose version", async () => {
    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          stdout: "1.29.2\n",
          status: 0,
          stderr: "",
          cmdline: "",
        };
      });

    const dockerComposeVersion = await getDockerComposeVersion();
    expect(spawnAsyncMock).toHaveBeenCalledWith("docker-compose", [
      "version",
      "--short",
    ]);
    expect(semver.gt(dockerComposeVersion, "1.29.1")).toBeTruthy();
  });

  it("Succeeds if docker version is OK", async () => {
    const getDockerVersionMock = jest
      .spyOn(docker, "getDockerVersion")
      .mockImplementation(async () => "20.10.7");
    const res = await docker.verifyDockerVersion("20.10.7")();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.successDebug).toEqual("20.10.7");
    expect(res.data).toEqual({ dockerVersion: "20.10.7" });
    expect(getDockerVersionMock).toBeCalled();
  });

  it("Succeeds if docker-compose version is OK", async () => {
    const getDockerComposeVersionMock = jest
      .spyOn(docker, "getDockerComposeVersion")
      .mockImplementation(async () => "1.29.3");

    const res = await docker.verifyDockerComposeVersion("1.29.2")();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.successDebug).toEqual("1.29.3");
    expect(res.data).toEqual({ dockerComposeVersion: "1.29.3" });
    expect(getDockerComposeVersionMock).toBeCalled();
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
    expect(res.data).toEqual({ dockerVersion: "0.1.2" });
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
    expect(res.data).toEqual({ dockerComposeVersion: "1.2.3" });
    expect(getDockerVersionMock).toBeCalled();
  });

  it("Loads docker images correctly", async () => {
    const spawnBashSelfExtractAsyncMock = jest
      .spyOn(subprocess, "spawnBashSelfExtractAsync")
      .mockImplementation(async () => {
        return {
          stdout: "Loaded Image: foo/bar:0.1\nLoaded Image: baz/kuku:4.2.0\n",
          status: 0,
          stderr: "",
          cmdline: "",
        };
      });

    const res = await docker.loadDockerImages("docker images")();
    expect(spawnBashSelfExtractAsyncMock).toBeCalledWith(
      "docker load -i",
      "docker images"
    );
    expect(res.success).toBeTruthy();
    expect(res.data).toEqual(["baz/kuku:4.2.0", "foo/bar:0.1"]);
  });

  it("Loads docker images fails", async () => {
    const spawnBashSelfExtractAsyncMock = jest
      .spyOn(subprocess, "spawnBashSelfExtractAsync")
      .mockImplementation(async () => {
        return {
          stdout: "",
          status: 1,
          stderr: "SOME ERROR",
          cmdline: "",
        };
      });

    const res = await docker.loadDockerImages("docker images")();
    expect(spawnBashSelfExtractAsyncMock).toBeCalledWith(
      "docker load -i",
      "docker images"
    );
    expect(res.success).toBeFalsy();
  });

  it("dockerComposeUp sanity", async () => {
    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          cmdline: "docker-compose up -d",
          status: 0,
          stderr: "",
          stdout: "OK",
        };
      });

    const res = await dockerComposeUp({ projectDirectory: "/tmp/foo" })();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.data).toEqual({ status: 0, stderr: "", stdout: "OK" });

    expect(spawnAsyncMock).toBeCalledWith("docker-compose", ["up", "-d"], {
      cwd: "/tmp/foo",
    });
  });

  it("dockerComposeUp sanity, multiple compose files", async () => {
    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          cmdline: "docker-compose up -d",
          status: 0,
          stderr: "",
          stdout: "OK",
        };
      });

    const res = await dockerComposeUp({
      projectDirectory: "/tmp/foo",
      composeFiles: ["docker-compose.yml", "docker-compose.prod.yml"],
    })();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.data).toEqual({ status: 0, stderr: "", stdout: "OK" });

    expect(spawnAsyncMock).toBeCalledWith(
      "docker-compose",
      ["-f docker-compose.yml", "-f docker-compose.prod.yml", "up", "-d"],
      {
        cwd: "/tmp/foo",
      }
    );
  });

  it("dockerComposeUp sanity, TEMPDIR", async () => {
    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          cmdline: "docker-compose up -d",
          status: 0,
          stderr: "",
          stdout: "OK",
        };
      });

    const res = await dockerComposeUp({
      projectDirectory: "/tmp/foo",
      temporaryDir: "/path/to/newTemp",
    })();

    expect(res.success).toBeTruthy();
    expect(res.successText).toEqual("OK");
    expect(res.data).toEqual({ status: 0, stderr: "", stdout: "OK" });

    expect(spawnAsyncMock).toBeCalledWith("docker-compose", ["up", "-d"], {
      cwd: "/tmp/foo",
      env: { TEMPDIR: "/path/to/newTemp" },
    });
  });

  it("dockerComposeUp fails if docker-compose fails", async () => {
    const spawnAsyncMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          cmdline: "docker-compose up -d",
          status: 1,
          stderr: "some error",
          stdout: "",
        };
      });

    const res = await docker.dockerComposeUp({
      projectDirectory: "/tmp/foo",
      composeFiles: ["docker-compose.yml", "docker-compose.prod.yml"],
    })();

    expect(res.success).toBeFalsy();
    expect(res.errorTitle).toEqual("Failed to bring up containers");
    expect(res.errorDescription).toEqual("some error");
    expect(res.data).toEqual({
      status: 1,
      stderr: "some error",
      stdout: "",
    });

    expect(spawnAsyncMock).toBeCalledWith(
      "docker-compose",
      ["-f docker-compose.yml", "-f docker-compose.prod.yml", "up", "-d"],
      {
        cwd: "/tmp/foo",
      }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
});
