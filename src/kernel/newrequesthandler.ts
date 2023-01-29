// import Log from "../app/services/log";
import { logContract } from "../contracts/logsContract";
import {
  filesHandler, headerContentTypes, headerKeys, HttpContextContract,
  httpRequestContract, httpResponseContract, newRequestContract,
  requestMethods, routeImpContract, routeMethodImpContract
} from "../contracts/requestsContracts";
import Route from "./routehandler";
import { env } from "./env";
let Log: any;

class HttpRequest implements httpRequestContract {
  req: any
  contentType: headerContentTypes
  body: any
  query: {[key: string]: string}
  filesArr: filesHandler

  constructor({req, contentType, body, query, files}: {req: any, contentType: headerContentTypes, body: string, query: {[key: string]: any}, files: filesHandler}) {
    this.req = req;
    this.contentType = contentType;
    this.body = body;
    this.query = query;
    this.filesArr = files;
  }

  all(): { [key: string]: any; } {
    return {
      ...this.body,
      ...this.query,
    }
  }

  header(key: string) {
    return this.req.headers[key] || '';
  }

  files(): filesHandler {
    return this.filesArr;
  }
}

class HttpResponse implements httpResponseContract {
  statusCode?: number;
  body?: number | string | object;
  headersArr: [headerKeys, headerContentTypes, ...string[]][] = [];

  status(code: number): this {
    this.statusCode = code;
    return this;
  }
  send(body: string | number | object): this {
    this.body = body;
    return this;
  }
  header(key: headerKeys, value: headerContentTypes, extra?: string): this {
    if (!key || !value) throw new Error('Key and/or value not informed');

    let header: [headerKeys, headerContentTypes, ...string[]] | undefined;
    if ((['Content-Type', 'Content-Length'] as headerKeys[]).includes(key)) {
      header = this.headersArr.find((h) => h[0] === key);
      if (!header) {
        header = [key, value];
        this.headersArr.push(header);
      }
      else header[1] = value;
    } else {
      header = [key, value];
      this.headersArr.push(header);
    }
    header[1] = value;
    if (header.length > 2) header.pop();
    if (extra) header[2] = extra;

    return this;
  }
}

class HttpContext implements HttpContextContract {
  req: any;
  res: any;
  method: requestMethods;
  contentType: headerContentTypes;
  contentTypeParams: string;
  path: string;
  body: any;
  query: {[key: string]: string};
  files: filesHandler;

  response: httpResponseContract;
  request: httpRequestContract;
  log: logContract

  params: {[key: string]: string | string[]} = {};

  constructor(newRequest: newRequestContract,
    httpResponse: httpResponseContract,
    httpRequest: httpRequestContract,
    log: logContract,
  ) {
    this.req = newRequest.req;
    this.res = newRequest.res;
    this.method = newRequest.method;
    this.contentType = newRequest.contentType;
    this.contentTypeParams = newRequest.contentTypeParams;
    this.path = newRequest.path;
    this.body = newRequest.body;
    this.query = newRequest.query;
    this.files = newRequest.files;

    this.response = httpResponse;
    this.request = httpRequest;
    this.log = log;
  }
}

export default class NewRequest implements newRequestContract {
  req: any;
  res: any;
  method: requestMethods;
  contentType: headerContentTypes;
  contentTypeParams: string;
  path: string;
  body: any;
  query: {[key: string]: string};
  files: filesHandler;

  constructor({req, res, method, contentType, contentTypeParams, path, body, query, files}: newRequestContract) {
    this.req = req;
    this.res = res;
    this.method = method;
    this.contentType = contentType;
    this.contentTypeParams = contentTypeParams;
    this.path = path;
    this.body = body;
    this.query = query;
    this.files = files;
  }

  async launch(): Promise<any> {
    if (!Log) Log = (await import(`${env.appDir}/services/log`)).default;
    const log = new Log({route: this.path, method: this.method}) as logContract;

    try {
      const pathArr = this.path.split('/').filter((str) => str);
      let implement: routeMethodImpContract | undefined;
      let implementDefault: routeMethodImpContract | undefined;
      let indexDefault: number = 0;
      let params: string[];
      let index = 0;
      const getRouteObj = (obj: routeImpContract, str: string): routeImpContract => {
        if (!obj || !obj.sub) return obj;
        return obj.sub[str];
      }
      do {
        const obj = pathArr.slice(0, index).reduce(getRouteObj, Route.routes);
        if (obj) {
          if (obj.implementDefault[this.method]) {
            implementDefault = obj.implementDefault[this.method];
            indexDefault = index;
          }
          params = pathArr.slice(index);
          implement = (obj.implement[this.method] || []).find((imp) => imp.params.length === params.length);
          index += 1;
        } else if (implementDefault) break;
        else throw new Error('Route not found');
      } while (!implement && index <= pathArr.length);

      let implementToUse: routeMethodImpContract;
      if (implement) implementToUse = implement;
      else if (implementDefault) implementToUse = implementDefault;
      else throw new Error('Route not found');

      const context = new HttpContext(
        {
          req: this.req,
          res: this.res,
          method: this.method,
          contentType: this.contentType,
          contentTypeParams: this.contentTypeParams,
          path: this.path,
          body: this.body,
          query: this.query,
          files: this.files,
        },
        new HttpResponse(),
        new HttpRequest({req: this.req, contentType: this.contentType, body: this.body, query: this.query, files: this.files}),
        log,
      );
      if (implement) implementToUse.params.forEach((key, indexK) => context.params[key] = params[indexK]);
      else context.params['*'] = pathArr.slice(indexDefault);
      log.setRequest({request: {...context.request.all(), files: context.request.files()}, params: context.params});
      await implementToUse.exec(context);

      let bodyResponse: number | string | undefined;
      if (context.response.body) {
        if (typeof context.response.body === 'object') {
          context.response.header('Content-Type', 'application/json');
          bodyResponse = JSON.stringify(context.response.body);
        } else bodyResponse = context.response.body;
      }
      context.response.headersArr.forEach((h) => this.res.set(h[0], h.slice(1).join(';')))

      log.setResponse({status: context.response.statusCode || 200, response: bodyResponse}).save();

      this.res.status(context.response.statusCode || 200).send(bodyResponse);
    } catch (error) {
      log.setError(error as Error).save();
      this.res.status(500).send('internal server error');
    }
  }
}
