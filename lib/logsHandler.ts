import {appendFileSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import moment from 'moment';

export class Logger {
    name: string;
    path: string;
    
    constructor(name?: string) {
        this.name = `${name || "installer"}-${moment(new Date()).format('YYYY-MM-DDThmmss')}.log`
        this.path = join(tmpdir(), this.name)
    }

    logToFile(message: string) {
        appendFileSync(this.path, `[INFO] ${new Date().toISOString()} ${message}\n`)
    }

}