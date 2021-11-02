import { log ,logPath} from "../utils/logsHandler";
import {readFileSync,existsSync} from "fs";


describe("Logger tests", () => {
    it("Log messages", async () => {
        const message = "logged message"
        log(message)
        const content = readFileSync(logPath);
        expect(content.toString()).toContain(message);
        expect(existsSync(logPath)).toBeTruthy();
    });
  });