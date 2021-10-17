import * as fs from "fs";
import * as child_process from "child_process";
import { Entry } from "./types";
import { spawnAsync, spawnBashAsync } from "./subprocess";

// ==================================================
// Final file structure:
// ==================================================
//
// +------------------------------------+
// | Standalone node                    |
// +------------------------------------+
// | binary 1                           |
// +------------------------------------+
// | binary n                           |
// +------------------------------------+
// | metadata json                      |
// +------------------------------------+
// | metadata length (4 characters)     |
// +------------------------------------+

export const getAllDockerImages = async (
  projectDirectory: string,
  composeFiles?: string[]
) => {
  // Allow the user to specify docker-compose.yml files
  const composeFilesFlag = composeFiles?.map((v) => `-f ${v}`) || [];

  const { stdout, stderr, status } = await spawnAsync(
    "docker-compose",
    composeFilesFlag.concat([`config`]),
    { cwd: projectDirectory }
  );

  if (status !== 0) {
    throw new Error(`Failed to get docker images ${stderr}`);
  }

  const allImages = stdout
    .split("\n")
    .map((v) => v.split("image:")[1])
    .filter((v) => v !== undefined)
    .map((v) => v.trim());

  // Remove duplicates (https://medium.com/dailyjs/how-to-remove-array-duplicates-in-es6-5daa8789641c)
  return Array.from(new Set(allImages));
};

export const saveDockerImagesToFile = async (
  projectDirectory: string,
  outputFile: string,
  composeFiles?: string[]
) => {
  const allImages = await getAllDockerImages(projectDirectory, composeFiles);

  let res = await spawnBashAsync(
    `docker save ${allImages.join(" ")} | gzip > ${outputFile}`
  );
  if (res.status !== 0) {
    console.error(res);
    throw new Error("Could not save images");
  }
};

export const getGitCommit = () => {
  try {
    const commit = child_process
      .execFileSync("git", ["log", "-1", "--format=%H"], { cwd: __dirname })
      .toString()
      .trim();
    return commit;
  } catch (error) {
    console.error("Cannot get git commit");
    console.error(error);
    return "??";
  }
};

export const createArchive = async (
  outputFile: string,
  cwd: string,
  files: string[]
) => {
  const res = await spawnAsync(
    "tar",
    ["-cvz", "-f", outputFile].concat(files),
    {
      cwd: cwd,
    }
  );
  if (res.status !== 0) {
    console.error(res);
    throw new Error("Could not create tar");
  }
};

export class SelfExtractingInstaller {
  initialFile: string;
  outputFile: string;
  entries: Entry[];

  constructor(initialFile: string, outputFile: string) {
    this.initialFile = initialFile;
    this.outputFile = outputFile;
    this.entries = [];
    fs.copyFileSync(this.initialFile, this.outputFile);
  }

  async addFile(filePath: string, name: string) {
    this.entries.push({
      name,
      size: fs.statSync(filePath).size,
      offset: fs.statSync(this.outputFile).size + 1,
    });
    const { status, stderr } = await spawnBashAsync(
      `cat ${filePath} >> ${this.outputFile}`
    );
    if (status !== 0) {
      throw new Error(stderr);
    }
  }

  compile() {
    const entriesString = JSON.stringify({
      entries: this.entries,
      commit: getGitCommit(),
    });
    const entriesLengthPadded = `${entriesString.length}`.padStart(4, "0");
    fs.appendFileSync(this.outputFile, entriesString);
    fs.appendFileSync(this.outputFile, entriesLengthPadded);
  }
}

export type InstallerFn = (installer: SelfExtractingInstaller) => Promise<void>;
