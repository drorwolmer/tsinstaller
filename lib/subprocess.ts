import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import { getEntry, INSTALLER_FILE } from "./utils";

export type spawnAsyncResult = {
  stdout: string;
  stderr: string;
  status: number;
  cmdline: string;
};

export const spawnAsync = async (
  command: string,
  args?: readonly string[] | undefined,
  options?: SpawnOptionsWithoutStdio
) =>
  new Promise<spawnAsyncResult>((resolve, reject) => {
    const stdoutBufferChunks: Buffer[] = [];
    const stderrBufferChunks: Buffer[] = [];
    const spawnProcess = spawn(command, args, options);
    spawnProcess.stdout.on("data", (data) => stdoutBufferChunks.push(data));
    spawnProcess.stderr.on("data", (data) => stderrBufferChunks.push(data));

    const finish = (code: number) => {
      return {
        stdout: Buffer.concat(stdoutBufferChunks).toString(),
        stderr: Buffer.concat(stderrBufferChunks).toString(),
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
