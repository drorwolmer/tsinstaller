import { Ora } from "ora";
export interface EnvMapping {
  [key: string]: string;
}

export type Entry = {
  offset: number;
  size: number;
  name: string;
};

export type StepResult<T> = {
  success: boolean;
  successText?: string;
  successDebug?: any;
  errorDescription?: string;
  errorTitle?: string;
  data?: T;
};

export type InstallerStepFn<T = any> = (
  spinner?: Ora
) => Promise<StepResult<T>>;

export type Step = {
  title: string;
  f: InstallerStepFn;
};

export type InstallerConfiguration = {
  header?: string;
  loggerFileName?: string;
};

export type InstallerMetadata = {
  entries: Entry[];
  variables: EnvMapping;
};
