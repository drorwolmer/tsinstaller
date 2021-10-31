import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import { getEntry, INSTALLER_FILE } from "./utils";

export const spawnAsync = async (
  command: string,
  args?: readonly string[] | undefined,
  options?: SpawnOptionsWithoutStdio
) =>
  new Promise<{
    stdout: string;
    stderr: string;
    status: number;
    cmdline: string;
  }>((resolve, reject) => {
    const stdoutBuffer: Buffer[] = [];
    const stderrBuffer: Buffer[] = [];
    const spawnProcess = spawn(command, args, options);
    spawnProcess.stdout.on("data", (data) => stdoutBuffer.push(data));
    spawnProcess.stderr.on("data", (data) => stderrBuffer.push(data));

    const finish = (code: number) => {
      return {
        stdout: stdoutBuffer.toString(),
        stderr: stderrBuffer.toString(),
        status: code,
        cmdline: spawnProcess.spawnargs.join(" "),
      };
    };

    spawnProcess.on("error", (error) => {
      reject(error);
    });

    spawnProcess.on("close", (code) => {
      if (code === null) {
        reject(new Error("Subprocess Timeout"));
      } else {
        resolve(finish(code));
      }
    });
  });

export const spawnBashAsync = async (
  command: string,
  options?: SpawnOptionsWithoutStdio
) => {
  return spawnAsync(
    "bash",
    ["-c"].concat(["set -euo pipefail; " + command]),
    options
  );
};

export const spawnBashSelfExtractAsync = async (
  command: string,
  name: string,
  options?: SpawnOptionsWithoutStdio,
  installerFile = INSTALLER_FILE
) => {
  const entry = getEntry(name, installerFile);
  const fdStr = `<(tail -c +${entry.offset} ${installerFile} | head -c ${entry.size})`;

  let cmd: string;
  if (command.includes("$FILE$")) {
    cmd = command.replace("$FILE$", fdStr);
  } else {
    cmd = `${command} ${fdStr}`;
  }

  return spawnBashAsync(cmd, options);
};
