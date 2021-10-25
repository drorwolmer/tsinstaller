import { InstallerStepFn } from "./types";
import { platform, cpus, totalmem } from "os";
import { spawnAsync } from "./subprocess";

// this is for mocking purposes (as you cannot mock os.platform directly)
export const getOsPlatform = () => platform();

export const isRoot = () => {
  return process.getuid && process.getuid() === 0;
};

export const getTotalCpuCores = () => {
  return cpus().length;
};

export const getTotalMemory = () => {
  return totalmem();
};

export const verifyRoot: InstallerStepFn = async () => {
  if (!isRoot()) {
    return {
      success: false,
      errorTitle: "Missing administrative privileges",
      errorDescription:
        "Administrative privileges required for this archive (use su or sudo)",
    };
  }
  return {
    success: true,
  };
};

export const verifyLinuxServiceEnabled =
  (serviceName: string): InstallerStepFn =>
  async () => {
    if (getOsPlatform() !== "linux") {
      return {
        success: true,
        successText: "OK",
        successDebug: "Skipping test because not Linux",
      };
    }

    const { stdout, status, stderr } = await spawnAsync("systemctl", [
      "is-enabled",
      serviceName,
    ]);

    if (status !== 0) {
      let errorDescription = stderr.trim();
      if (stdout.trim() === "disabled") {
        errorDescription = `service ${serviceName} is disabled. Enable it using [systemctl enable --now ${serviceName}]`;
      }
      return {
        success: false,
        errorTitle: `service ${serviceName} is not enabled`,
        errorDescription: errorDescription,
      };
    }

    return {
      success: true,
      successText: "OK",
    };
  };

export const verifyMinCpuRequirements =
  (minCpuCores: number): InstallerStepFn =>
  async () => {
    if (getTotalCpuCores() >= minCpuCores) {
      return {
        success: true,
        successText: "OK",
      };
    } else {
      return {
        success: false,
        errorTitle: `This system does not meet minimum requirements`,
        errorDescription: `Minimum system CPU requirments ${minCpuCores} logical cores`,
      };
    }
  };

export const verifyMinMemoryRequirements =
  (minMemoryBytes: number): InstallerStepFn =>
  async () => {
    if (getTotalMemory() >= minMemoryBytes) {
      return {
        success: true,
        successText: "OK",
      };
    } else {
      return {
        success: false,
        errorTitle: `This system does not meet minimum requirements`,
        errorDescription: `Minimum system RAM requirments ${minMemoryBytes} Bytes`,
      };
    }
  };
