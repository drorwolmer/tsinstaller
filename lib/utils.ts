import * as fs from "fs";
import * as os from "os";
import { InstallerMetadata } from ".";
import { Entry } from "./types";

export const INSTALLER_FILE = process.env["INSTALLER_FILE"] || process.execPath;

export const OS_TYPE = os.type();
export const OS_RELEASE = os.release();
export const OS_PLATFORM = os.platform();

let _installerMetadata: InstallerMetadata;
const getInstallerMetadata = (installerFilePath = INSTALLER_FILE) => {
  if (_installerMetadata) {
    return _installerMetadata;
  }
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

  return JSON.parse(buffer.toString()) as InstallerMetadata;
};

export const getCompileTimeVariable = (
  key: string,
  installerFilePath = INSTALLER_FILE
): string | undefined => {
  return getInstallerMetadata(installerFilePath).variables[key];
};

export const getEntry = (name: string, installerFilePath = INSTALLER_FILE) => {
  const installerMetadata = getInstallerMetadata(installerFilePath);
  const t = installerMetadata.entries.find((v) => v.name === name);
  if (t === undefined) {
    throw new Error(`Could not find entry '${name}'`);
  }
  return t;
};

export const zip = <T, T2>(a: T[], b: T2[]): [T, T2][] => {
  return a.map((k, i) => [k, b[i]]);
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
