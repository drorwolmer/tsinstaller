import {
  spawnAsync,
  spawnBashSelfExtractAsync,
  spawnAsyncResult,
} from "./subprocess";
import { InstallerStepFn } from "./types";
import * as semver from "semver";
import Table from "cli-table";

export const parseDockerVersionsFromStdout = (
  stdout: string
): string | null => {
  //  Remove newlines and commas (Sometimes this stdout ws observed... '20.10.8,\n')
  let version = stdout.trim().split(",")[0];

  // Remove leading zeros because they are invalid semver...
  version = version.replace(/\.0+/g, ".");

  return semver.clean(version);
};

export const getDockerVersion = async () => {
  const { stdout, status, stderr, cmdline } = await spawnAsync("docker", [
    "version",
    "--format={{.Server.Version}}",
  ]);
  if (status !== 0) {
    throw new Error(stderr);
  }

  const dockerVersion = parseDockerVersionsFromStdout(stdout);
  if (dockerVersion === null) {
    throw new Error(`Could not parse docker version ${stdout} ${stderr}`);
  }
  return dockerVersion;
};

export const getDockerComposeVersion = async () => {
  const { stdout, status, stderr } = await spawnAsync("docker-compose", [
    "version",
    "--short",
  ]);
  if (status !== 0) {
    throw new Error(stderr);
  }
  const dockerComposeVersion = parseDockerVersionsFromStdout(stdout);
  if (dockerComposeVersion === null) {
    throw new Error(`Could not parse docker-compose version ${stdout}`);
  }
  return dockerComposeVersion;
};

export const verifyDockerVersion =
  (
    minDockerVersion: string
  ): InstallerStepFn<{ dockerVersion: string | undefined }> =>
  async () => {
    if (!semver.valid(minDockerVersion)) {
      throw new Error("minDockerVersion is invalid");
    }
    try {
      const dockerVersion = await getDockerVersion();
      if (semver.lt(dockerVersion, minDockerVersion)) {
        return {
          success: false,
          errorTitle: `Docker version ${dockerVersion} is lower then min version ${minDockerVersion}`,
          data: { dockerVersion },
        };
      }
      return {
        success: true,
        successText: "OK",
        successDebug: dockerVersion,
        data: { dockerVersion },
      };
    } catch (error) {
      let errorDescription = `${error}`;
      if ((error as Error).message.includes("ENOENT")) {
        errorDescription = "docker: command not found";
      }
      return {
        success: false,
        errorTitle: "Could not verify Docker version",
        errorDescription,
        data: { dockerVersion: undefined },
      };
    }
  };

export const verifyDockerComposeVersion =
  (
    minDockerComposeVersion: string
  ): InstallerStepFn<{ dockerComposeVersion: string | undefined }> =>
  async () => {
    try {
      const dockerComposeVersion = await getDockerComposeVersion();
      if (semver.lt(dockerComposeVersion, minDockerComposeVersion)) {
        return {
          success: false,
          errorTitle: `docker-compose version ${dockerComposeVersion} is lower then min version ${minDockerComposeVersion}`,
          data: { dockerComposeVersion },
        };
      }
      return {
        success: true,
        successText: "OK",
        successDebug: dockerComposeVersion,
        data: { dockerComposeVersion },
      };
    } catch (error) {
      let errorDescription = `${error}`;
      if ((error as Error).message.includes("ENOENT")) {
        errorDescription = "docker-compose: command not found";
      }
      return {
        success: false,
        errorTitle: "Could not verify docker-compose version",
        errorDescription,
        data: { dockerComposeVersion: undefined },
      };
    }
  };

export const loadDockerImages =
  (name: string): InstallerStepFn<string[]> =>
  async () => {
    const { status, stderr, stdout } = await spawnBashSelfExtractAsync(
      "docker load -i",
      name
    );
    if (status !== 0) {
      return {
        success: false,
        errorTitle: "Failed to load docker images",
        errorDescription: stderr,
      };
    }

    const loadedImages = stdout
      .split("\n")
      .map((v) => v.split(": ", 2)[1])
      .filter((v) => v !== undefined);

    const table = new Table({
      head: ["Loaded Images"],
      style: { head: ["bold"] },
    });
    loadedImages.sort().forEach((v) => {
      table.push([v]);
    });

    return {
      success: true,
      successText: "Loaded docker images",
      successDebug: table.toString(),
      data: loadedImages,
    };
  };

export type dockerComposeUpOptions = {
  projectDirectory: string;
  composeFiles?: string[];
  temporaryDir?: string; // Needed sometimes because of https://github.com/docker/compose/issues/4137
};
export const dockerComposeUp =
  (options: dockerComposeUpOptions): InstallerStepFn<spawnAsyncResult> =>
  async () => {
    // Either have ["-f foo", "-f bar"] or []
    const composeFilesFlag = options.composeFiles?.map((v) => `-f ${v}`) || [];

    let env: NodeJS.ProcessEnv | undefined = undefined;
    if (options.temporaryDir) {
      env = { ...process.env, TMPDIR: options.temporaryDir };
    }

    const { cmdline, stdout, stderr, status } = await spawnAsync(
      "docker-compose",
      composeFilesFlag.concat(["up", "-d"]),
      { cwd: options.projectDirectory, env }
    );

    if (status !== 0) {
      return {
        success: false,
        errorTitle: "Failed to bring up containers",
        errorDescription: stderr,
        data: { stdout, stderr, status, cmdline },
      };
    }

    return {
      success: true,
      successText: "OK",
      data: { stdout, stderr, status, cmdline },
    };
  };
