import { log } from "../utils/logsHandler";
import {readFileSync,existsSync} from "fs";
import {tmpdir} from "os";
import {join} from "path"


describe("Logger tests", () => {
    it("Log messages", async () => {
        const message = "logged message"
        log(message)
        const dir = join(tmpdir(),"installer.log")
        const content = readFileSync(dir);
        expect(content.toString()).toContain(message);
        expect(existsSync(dir)).toBeTruthy();
    });
  });