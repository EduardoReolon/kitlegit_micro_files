import { logContract, logRecordContract, sideData } from "../contracts/logsContract";
import { requestMethods } from "../contracts/requestsContracts";

export default class BaseLog implements logContract {
  timeStart: number;
  // public log: Log;
  public log: logRecordContract = {};
  response?: any;
  sideData: sideData = {};
  request: { [key: string]: any; } | undefined;
  params: { [key: string]: string | string[]; } | undefined;

  constructor ({route = '', method}: {route?: string, method?: requestMethods}) {
    // this.log = new Log();
    this.log.route = route;
    this.log.method = method;
    this.timeStart = Date.now();
  }

  setRequest({request, params}: {request: {[key: string]: any}, params: {[key: string]: string | string[]}}) {
    this.request = request;
    this.params = params;
    return this;
  }

  setUser_id(user_id: number) {
    if (typeof user_id !== 'number') user_id = parseInt(user_id);
    if (!Number.isNaN(user_id)) this.log.user_id = user_id;
    return this;
  }

  setResponse ({status, response}: {status?: number, response?: any}) {
    if (status) this.log.response_status = status;
    if (response) this.response = response;
    return this;
  }

  setSideData (sideData: sideData) {
    Object.keys(sideData).forEach((key) => this.sideData[key] = sideData[key]);
    return this;
  }

  setError (error: Error | string | {[key: string]: string | number} | number) {
    if (error) {
      if (typeof error === 'string') this.log.error_message = error.slice(0, 2000);
      else if (typeof error === 'number') this.log.error_message = error.toString();
      else if (typeof error === 'object') {
        if (error.message && typeof error.message === 'string') this.log.error_message = error.message.slice(0, 2000);
        else this.log.error_message = JSON.stringify(error).slice(0, 2000);
        if (typeof error.stack === 'string') this.log.error_stack = error.stack.slice(0, 2000);
      }
    }
    return this;
  }

  finishLog() {
    if (this.response) {
      if (typeof this.response === 'string') {
        if (['{', '['].includes(this.response[0])) this.log.response = this.response;
      } else {
        const fieldsRemove = ['token', 'refreshToken', 'email'];
        if (fieldsRemove.some((field) => this.response[field])) {
          this.response = JSON.parse(JSON.stringify(this.response));
          fieldsRemove.forEach((field) => delete this.response[field]);
        }
        try {
          if (this.response.type !== 'Buffer') this.log.response = JSON.stringify(this.response);
        } catch (error) {
          this.log.response = JSON.stringify({msg: 'Response is not a string'});
        }
      }
    }
    if (this.request) this.log.request = JSON.stringify(this.request);
    if (this.params) this.log.params = JSON.stringify(this.params);

    if (this.log.request) {
      const request = JSON.parse(this.log.request.toString());
      const fieldsDelete = ['password', 'sensitive_data'];
      if (fieldsDelete.some((f) => request[f])) {
        fieldsDelete.forEach((f) => delete request[f]);
        this.log.request = JSON.stringify(request);
      }
    }
    this.log.side_data = JSON.stringify(this.sideData);

    this.log.time = Date.now() - this.timeStart;

    return this;
  }

  async save() {
    this.finishLog();
    throw new Error('Implement save method');
  }
}
