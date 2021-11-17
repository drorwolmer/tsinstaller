import ora from "ora";
import { cyan, bold, green, red } from "cli-color";
import { Step, StepResult, InstallerConfiguration } from "./types";
import logSymbols from "log-symbols";
import { InstallerStepFn } from "./types";
import { Logger} from "./logsHandler";

const sp = {
  interval: 80,
  frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"].map((v) =>
    bold(`[${cyan(v)}]`)
  ),
};

const step = async (title: string, f: InstallerStepFn) => {
  const spinner = ora({
    text: bold(title),
    spinner: sp,
    color: "white",
  }).start();

  let res: StepResult<any>;
  try {
    res = await f(spinner);
  } catch (error) {
    res = {
      success: false,
      errorDescription: `${error}`,
      errorTitle: "Failed",
      data: error,
    };
  }

  if (res.success) {
    spinner.stopAndPersist({
      text: bold(`${title} ${green(res.successText)}`),
      symbol: bold(`[${green(logSymbols.success)}]`),
    });
  } else {
    spinner.stopAndPersist({
      text: bold(`${title} ${red(res.errorTitle)}`),
      symbol: bold(`[${red(logSymbols.error)}]`),
    });
  }

  return res;
};

export const startInstaller = async (steps: Step[], config: InstallerConfiguration = {}) => {
  if (config.header) {
    console.info(config.header);
  }
  const logger = new Logger(config.loggerFileName)
  for (const { title, f } of steps) {
    const res = await step(title, f);
    logger.logToFile(JSON.stringify({...{"title" : title}, ...res}, null));
    if (res.success && res.successDebug !== undefined) {
      console.info(res.successDebug);
    }
    if (process.env.DEBUG === "1") {
      console.info(JSON.stringify(res, null, 4));
    }
    if (!res.success) {
      if (res.errorDescription !== undefined) {
        console.error(res.errorDescription);
      }
      console.error(`Installation failed, further info can be found on: ${logger.logPath()}`);
      process.exit(1);
    }
  }
};
