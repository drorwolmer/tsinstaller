import { parse, stringify } from "envfile";
import * as fs from "fs";
import { InstallerStepFn } from "./types";

interface EnvMapping {
  [key: string]: string;
}

export const readEnvValues = (envFile: fs.PathLike): EnvMapping => {
  return parse(fs.readFileSync(envFile, "utf-8"));
};

export const setEnvFile = (envFile: fs.PathLike, env: EnvMapping) => {
  // Create envfile if it does not exist
  if (!fs.existsSync(envFile)) {
    fs.writeFileSync(envFile, stringify(env));
  } else {
    const currentEnv = readEnvValues(envFile);
    // Merge the old environments and the new, without overriding existing values
    const newEnv: EnvMapping = { ...env, ...currentEnv };
    fs.writeFileSync(envFile, stringify(newEnv));
  }
};

export const setEnvFileStep =
  (envFile: fs.PathLike, env: EnvMapping): InstallerStepFn<EnvMapping> =>
  async () => {
    setEnvFile(envFile, env);

    return {
      success: true,
      data: readEnvValues(envFile),
    };
  };
