import * as fs from "fs";
import * as os from "os";
import { Entry } from "./types";

export const INSTALLER_FILE = process.env["INSTALLER_FILE"] || process.execPath;

export const OS_TYPE = os.type();
export const OS_RELEASE = os.release();
export const OS_PLATFORM = os.platform();

const getEntries = (installerFilePath = INSTALLER_FILE) => {
  const fd = fs.openSync(installerFilePath, "r");
  var buffer = Buffer.alloc(4);
  fs.readSync(fd, buffer, {
    offset: 0,
    length: 4,
    position: fs.statSync(installerFilePath).size - 4,
  });
  const mapSize = parseInt(buffer.toString());
  buffer = Buffer.alloc(mapSize);
  fs.readSync(fd, buffer, {
    offset: 0,
    length: mapSize,
    position: fs.statSync(installerFilePath).size - 4 - mapSize,
  });

  fs.close(fd);

  return JSON.parse(buffer.toString()) as { entries: Entry[]; commit: string };
};

export const getCommit = (installerFilePath = INSTALLER_FILE) => {
  const { commit } = getEntries(installerFilePath);
  return commit;
};

export const getEntry = (name: string, installerFilePath = INSTALLER_FILE) => {
  const { entries } = getEntries(installerFilePath);
  const t = entries.find((v) => v.name === name);
  if (t === undefined) {
    throw new Error(`Could not find entry '${name}'`);
  }
  return t;
};

export const zip = <T, T2>(a: T[], b: T2[]): [T, T2][] => {
  return a.map((k, i) => [k, b[i]]);
};
