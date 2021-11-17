import { Logger } from "../lib/logsHandler";
import {readFileSync,existsSync} from "fs";

describe("Logger tests", () => {
    it("Log messages", async () => {
        const message = "logged message"
        const logger = new Logger()
        logger.logToFile(message)
        const content = readFileSync(logger.logPath());
        expect(content.toString()).toContain(message);
        expect(existsSync(logger.logPath())).toBeTruthy();
    });
  });
