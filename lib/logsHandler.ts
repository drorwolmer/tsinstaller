import {appendFileSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import moment from 'moment';

export class Logger {
    pathToLogFile: string;
    
    constructor(name?: string) {
        const fileName = `${name || "installer"}-${moment(new Date()).format('YYYY-MM-DDThmmss')}.log`
        this.pathToLogFile = join(tmpdir(), fileName)
    }

    logToFile(message: string) {
        appendFileSync(this.pathToLogFile, `[INFO] ${new Date().toISOString()} ${message}\n`)
    }

}