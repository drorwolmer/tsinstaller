import { resetLogFile, log } from "../utils/logsHandler";
import {readFileSync,existsSync} from "fs";
import {tmpdir} from "os";
import {join} from "path"


describe("Installer tests", () => {
    it("Log messages", async () => {
        const message = "logged message"
        log(message)
        const dir = join(tmpdir(),"installer.log")
        const content = readFileSync(dir);
        expect(content.toString()).toContain(message);
        expect(existsSync(dir)).toBeTruthy();
    });
  
    it("fails if step throws exception", async () => {
        resetLogFile()
        const dir = join(tmpdir(),"installer.log")
        const content = readFileSync(dir);
        expect(content.toString()).toEqual("");
    });
  });