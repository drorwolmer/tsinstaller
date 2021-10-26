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
  (
    minCpuCores: number
  ): InstallerStepFn<{ cpuCores: number; minCpuCores: number }> =>
  async () => {
    const cpuCores = getTotalCpuCores();
    if (cpuCores >= minCpuCores) {
      return {
        success: true,
        successText: "OK",
        data: { cpuCores, minCpuCores },
      };
    } else {
      return {
        success: false,
        errorTitle: `This system does not meet minimum requirements`,
        errorDescription: `Minimum system CPU requirments ${minCpuCores} logical cores`,
        data: { cpuCores, minCpuCores },
      };
    }
  };

export const verifyMinMemoryRequirements =
  (minMemoryBytes: number): InstallerStepFn =>
  async () => {
    const totalMemory = getTotalMemory();
    const data = {
      totalMemory,
      totalMemoryMb: Math.floor(totalMemory / (1024 * 1024)),
      minMemoryBytes,
      minMemoryMB: Math.floor(minMemoryBytes / (1024 * 1024)),
    };
    if (totalMemory >= minMemoryBytes) {
      return {
        success: true,
        successText: "OK",
        data,
      };
    } else {
      return {
        success: false,
        errorTitle: `This system does not meet minimum requirements`,
        errorDescription: `Minimum system RAM requirments ${minMemoryBytes} Bytes`,
        data,
      };
    }
  };
