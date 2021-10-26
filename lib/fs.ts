import { spawnBashSelfExtractAsync } from "./subprocess";
import { InstallerStepFn } from "./types";
import * as fs from "fs";
import checkDiskSpace, { DiskSpace } from "check-disk-space";
import { getOsPlatform } from "./os";

export const verifyDiskSpace =
  (
    minSizeBytes: number
  ): InstallerStepFn<{
    diskSpace: DiskSpace;
    requiredGB: number;
    availableGB: number;
  }> =>
  async () => {
    let diskSpace: DiskSpace;
    if (getOsPlatform() === "linux") {
      diskSpace = await checkDiskSpace("/var/lib/docker");
    } else {
      diskSpace = await checkDiskSpace("/");
    }

    const requiredGB = minSizeBytes / (1024 * 1024 * 1024);
    const availableGB = diskSpace.free / (1024 * 1024 * 1024);

    const data = {
      diskSpace,
      requiredGB,
      availableGB,
    };

    if (diskSpace.free < minSizeBytes) {
      return {
        success: false,
        errorTitle: "Insufficient disk space",
        errorDescription: `Installer requires at least ${requiredGB}GB free`,
        data,
      };
    }

    return {
      success: true,
      data,
      successText: "OK",
    };
  };

export const untar =
  (name: string, path: fs.PathLike): InstallerStepFn =>
  async () => {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }

    const { status, stderr, stdout, cmdline } = await spawnBashSelfExtractAsync(
      "tar -xzvf",
      name,
      { cwd: path.toString() }
    );
    if (status === 0) {
      return {
        success: true,
        successText: "OK",
        successDebug: `Extracted to ${path}`,
        data: { status, stderr, stdout, cmdline },
      };
    }
    return {
      success: false,
      errorTitle: "Failed to extract archive",
      errorDescription: stderr,
      data: { status, stderr, stdout, cmdline },
    };
  };
