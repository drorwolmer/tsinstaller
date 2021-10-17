#!/usr/bin/env ts-node
import clc from "cli-color";
import * as path from "path";
import { InstallerFn, SelfExtractingInstaller } from "../lib/compile";
import { spawnBashAsync } from "../lib/subprocess";

const RECEPIE = process.argv[2];
const OUTPUT_FILE = process.env["OUTPUT_FILE"] || "/tmp/installer_build/foo";
const INPUT_BINARY =
  process.env["INPUT_BINARY"] || "/tmp/installer_build/bundle";
const INSTALLER_JS_BUNDLE = "dist/bundle.js";

const recepieFile = path.join(process.env.INIT_CWD || process.cwd(), RECEPIE);

const all = async () => {
  const { compileSteps }: { compileSteps: InstallerFn } = await import(
    recepieFile
  );

  console.info(clc.bold("[+] Packaging "));
  let { stdout, status, stderr } = await spawnBashAsync(
    `yarn esbuild ${recepieFile} --target=esnext --platform=node --bundle --outfile=${INSTALLER_JS_BUNDLE}`
  );
  console.error({ stdout, status, stderr });

  // console.info(clc.bold("[+] Removing 'node:' package prefixes..."));
  // ({ stdout, status, stderr } = await spawnBashAsync(
  //   `sed 's/node://g' ${INSTALLER_JS_BUNDLE} > ${INSTALLER_JS_BUNDLE}.fixed`
  // ));
  // console.error({ stdout, status, stderr });

  console.info(clc.bold("[+] Creating single binary executable"));
  ({ stdout, status, stderr } = await spawnBashAsync(
    `pkg ${INSTALLER_JS_BUNDLE} -o ${INPUT_BINARY}`
  ));
  console.error({ stdout, status, stderr });

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
