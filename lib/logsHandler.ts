import {appendFileSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import moment from 'moment';

export class Logger {
    filePath: string;
    
    constructor(name?: string) {
        const fileName = `${name || "installer"}-${moment(new Date()).format('YYYY-MM-DDThmmss')}.log`
        this.filePath = join(tmpdir(), fileName)
    }

    logToFile(message: string) {
        appendFileSync(this.filePath, `[INFO] ${new Date().toISOString()} ${message}\n`)
    }

}