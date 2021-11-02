import {appendFileSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import moment from 'moment';

const timeStamp = () => {
    return moment(new Date()).format('YYYY-MM-DDThmmss')
  };
const logFileName = `installer-${timeStamp()}.log`
export const logPath = join(tmpdir(), logFileName)

export const log = (message: string) => {
    appendFileSync(logPath, `[INFO] ${timeStamp()}  ${message} \n`)
}



