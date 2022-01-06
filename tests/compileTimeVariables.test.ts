import * as fs from "fs";
import * as envFile from "../lib/envFile";

jest.mock("fs");
describe("Compile time variavles tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  afterAll(() => {
    jest.resetModules();
  });

  it("readCompileTimeVariables() happy path", async () => {
    const readEnvValuesMock = jest
      .spyOn(envFile, "readEnvValues")
      .mockReturnValue({
        foo: "bar",
      });
    const existsSyncMock = jest.spyOn(fs, "existsSync").mockReturnValue(true);
    expect(envFile.getCompileTimeVariables()).toEqual({ foo: "bar" });
    expect(readEnvValuesMock).toHaveBeenCalledTimes(1);
  });

  it("readCompileTimeVariables() file not exists, returns undefined", async () => {
    const existsSyncMock = jest.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(envFile.getCompileTimeVariables()).toEqual({});
    expect(existsSyncMock).toHaveBeenCalled();
  });
});
