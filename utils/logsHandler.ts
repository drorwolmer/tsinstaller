import {writeFileSync, appendFileSync} from "fs";
import {tmpdir} from "os";
import {join} from "path"

const timeStamp = () => {
    return new Date().toISOString().replace(/([^T]+)T([^\.]+).*/g, '$1 $2').replace(/[\s]/g,'_').replace(/[:]/g,'-');
  };
const logFileName = `installer-${timeStamp()}.log`
const logDir = join(tmpdir(), logFileName)

export const log = (message: string) => {
    appendFileSync(logDir, `[INFO] ${timeStamp()}  ${message} \n`)
}


