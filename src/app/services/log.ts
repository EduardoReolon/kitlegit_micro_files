import BaseLog from "../../kernel/baseLog";
import Helpers from "../Helpers";
const fs = require('fs');

export default class Log extends BaseLog {
  async save(skipNewLogOnError?: boolean) {
    try {
      this.finishLog();

      const now = new Date();
      const hour = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const path = Helpers.appRoot(`logs/${now.getFullYear()}/${now.getMonth() + 1}`);
      fs.mkdirSync(path, {recursive: true});
      fs.appendFileSync(
        `${path}/${now.getDate()}.txt`,
        `${hour}-${this.log.response_status || -1}-${this.log.method || 'noMethod'}-${this.log.route || 'noRoute'} - ${JSON.stringify(this.log)}\r\n`,
        {flag: 'as+', force: true}, // creates files if doesn't exist
      );
    } catch (err) {
      if (!skipNewLogOnError) {
        new Log({route: 'Error saving log'})
          .setResponse({status: 0})
          .setError(err as Error)
          .save(true);
      }
    }
  }
}
