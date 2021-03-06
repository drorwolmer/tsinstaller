#!/usr/bin/env ts-node
import clc from "cli-color";
import { rmdirSync, rmSync } from "fs";
import * as path from "path";
import { dirname } from "path/posix";
import { EnvMapping, setEnvFile } from "../lib";
import { InstallerFn, SelfExtractingInstaller } from "../lib/compile";
import { spawnBashAsync } from "../lib/subprocess";

const RECEPIE = process.argv[2];
const OUTPUT_FILE = process.env["OUTPUT_FILE"] || "/tmp/installer_build/foo";
const INPUT_BINARY =
  process.env["INPUT_BINARY"] || "/tmp/installer_build/bundle";
const INSTALLER_JS_BUNDLE = "dist/bundle.js";
const COMPILE_TIME_ENV_FILE_PATH = path.join(
  path.dirname(INSTALLER_JS_BUNDLE),
  ".build.env"
);
const PKG_TARGET = process.env["PKG_TARGET"] || "node16";

const recepieFile = path.join(process.env.INIT_CWD || process.cwd(), RECEPIE);

const all = async () => {
  console.info(clc.bold("[+] Deleting dist/ dir"));
  rmSync("dist/", { recursive: true, force: true });

  const { compileSteps }: { compileSteps: InstallerFn } = await import(
    recepieFile
  );

  console.info(clc.bold("[+] Packaging "));
  let { stdout, status, stderr, cmdline } = await spawnBashAsync(
    `yarn esbuild ${recepieFile} --target=esnext --platform=node --bundle --outfile=${INSTALLER_JS_BUNDLE}`
  );
  console.error({ stdout, status, stderr, cmdline });

  if (status !== 0) {
    throw new Error(`Failed to package ${stderr}`);
  }

  console.info(clc.bold("[+] Creating single binary executable"));
  ({ stdout, status, stderr, cmdline } = await spawnBashAsync(
    `pkg --targets ${PKG_TARGET} ${INSTALLER_JS_BUNDLE} --output ${INPUT_BINARY}`
  ));
  console.error({ stdout, status, stderr, cmdline });

  if (status !== 0) {
    throw new Error(`Failed to package ${stderr}`);
  }

  console.info(
    clc.bold(
      `[+] Running compile steps from recepie [${RECEPIE}] to output [${OUTPUT_FILE}]`
    )
  );
  const installer = new SelfExtractingInstaller(INPUT_BINARY, OUTPUT_FILE);
  await compileSteps(installer);
  installer.compile();

  console.info(clc.bold("DONE!") + " " + OUTPUT_FILE);
};
all();
