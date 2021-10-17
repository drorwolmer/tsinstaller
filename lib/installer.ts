import ora from "ora";
import { cyan, bold, green, red } from "cli-color";
import { Step, StepResult } from "./types";
import logSymbols from "log-symbols";
import { InstallerStepFn } from "./types";

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
    res = await f();
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

export const startInstaller = async (steps: Step[], header?: string) => {
  if (header) {
    console.info(header);
  }

  for (const { title, f } of steps) {
    const res = await step(title, f);
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
      process.exit(1);
    }
  }
};
