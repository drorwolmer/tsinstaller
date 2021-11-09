import { readFileSync, existsSync } from "fs";
import { logToFile, LOG_PATH } from "../lib/logsHandler";

describe("Logger tests", () => {
  it("Log messages", async () => {
    const message = "logged message";
    logToFile(message);
    const content = readFileSync(LOG_PATH);
    expect(content.toString()).toContain(message);
    expect(existsSync(LOG_PATH)).toBeTruthy();
  });
});
