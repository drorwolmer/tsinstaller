import {writeFileSync, appendFileSync} from "fs";
import {tmpdir} from "os";
import {join} from "path"

const logDir = join(tmpdir(), "installer.log")

export const resetLogFile = () => {
    writeFileSync(logDir, "")
};

export const log = (message: string) => {
    const timestamp = new Date().toLocaleString();
    appendFileSync(logDir, `[INFO] ${timestamp}  ${message} \n`)
}


