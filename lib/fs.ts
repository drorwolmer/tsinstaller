import { spawnBashSelfExtractAsync } from "./subprocess";
import { InstallerStepFn } from "./types";
import * as fs from "fs";

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
        successText: "Extracted",
      };
    }
    return {
      success: false,
      errorTitle: "Failed to extract archive",
      errorDescription: stderr,
    };
  };
