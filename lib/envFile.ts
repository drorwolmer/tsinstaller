import { parse, stringify } from "envfile";
import * as fs from "fs";
import * as path from "path";
import { EnvMapping, InstallerStepFn } from "./types";

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

export const getCompileTimeVariables = (): EnvMapping => {
  const envFile = path.join(__dirname, ".build.env");
  if (!fs.existsSync(envFile)) {
    console.warn("readCompileTimeVariables() env file not found in ", envFile);
    return {};
  }
  return readEnvValues(envFile);
};

export const COMPILE_TIME_VARIABLES = getCompileTimeVariables();

export const setEnvFileStep =
  (envFile: fs.PathLike, env: EnvMapping): InstallerStepFn<EnvMapping> =>
  async () => {
    setEnvFile(envFile, env);

    return {
      success: true,
      data: readEnvValues(envFile),
    };
  };
