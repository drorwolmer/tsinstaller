import { logToFile ,LOG_PATH} from "../utils/logsHandler";
import {readFileSync,existsSync} from "fs";


describe("Logger tests", () => {
    it("Log messages", async () => {
        const message = "logged message"
        logToFile(message)
        const content = readFileSync(LOG_PATH);
        expect(content.toString()).toContain(message);
        expect(existsSync(LOG_PATH)).toBeTruthy();
    });
  });