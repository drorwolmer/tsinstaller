import {appendFileSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import moment from 'moment';

const LOG_FILE_NAME = `installer-${moment(new Date()).format('YYYY-MM-DDThmmss')}.log`
export const LOG_PATH = join(tmpdir(), LOG_FILE_NAME)

export const logToFile = (message: string) => {
    appendFileSync(LOG_PATH, `[INFO] ${new Date().toISOString()} ${message}\n`)
}



