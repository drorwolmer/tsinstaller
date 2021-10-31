import { log ,logDir} from "../utils/logsHandler";
import {readFileSync,existsSync} from "fs";


describe("Logger tests", () => {
    it("Log messages", async () => {
        const message = "logged message"
        log(message)
        const content = readFileSync(logDir);
        expect(content.toString()).toContain(message);
        expect(existsSync(logDir)).toBeTruthy();
    });
  });