import { logContract } from "./logsContract";

export type requestMethods = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

export type headerKeys = 'Content-Type' | 'Content-Length';

export type headerContentTypes = 'application/java-archive' | 'application/EDI-X12' | 'application/EDIFACT' | 'application/javascript' | 'application/octet-stream' | 'application/ogg' | 'application/pdf' | 'application/xhtml+xml' | 'application/x-shockwave-flash' | 'application/json' | 'application/ld+json' | 'application/xml' | 'application/zip' | 'application/x-www-form-urlencoded'
  | 'audio/mpeg' | 'audio/x-ms-wma' | 'audio/vnd.rn-realaudio' | 'audio/x-wav'
  | 'image/gif' | 'image/jpeg' | 'image/png' | 'image/tiff' | 'image/vnd.microsoft.icon' | 'image/x-icon' | 'image/vnd.djvu' | 'image/svg+xml'
  | 'multipart/mixed' | 'multipart/alternative' | 'multipart/related (using by MHTML (HTML mail).)' | 'multipart/form-data'
  | 'text/css' | 'text/csv' | 'text/html' | 'text/javascript (obsolete)' | 'text/plain' | 'text/xml'
  | 'video/mpeg' | 'video/mp4' | 'video/quicktime' | 'video/x-ms-wmv' | 'video/x-msvideo' | 'video/x-flv' | 'video/webm'
  | 'application/vnd.android.package-archive' | 'application/vnd.oasis.opendocument.text' | 'application/vnd.oasis.opendocument.spreadsheet' | 'application/vnd.oasis.opendocument.presentation' | 'application/vnd.oasis.opendocument.graphics' | 'application/vnd.ms-excel' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' | 'application/vnd.ms-powerpoint' | 'application/vnd.openxmlformats-officedocument.presentationml.presentation' | 'application/msword' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'application/vnd.mozilla.xul+xml';

export type filesHandler = {
  fieldname: string,
  originalname: string,
  encoding: string,
  mimetype: headerContentTypes,
  destination: string,
  filename: string,
  path: string,
  size: number
}[];

export interface newRequestContract {
  req: any
  res: any
  method: requestMethods,
  contentType: headerContentTypes,
  contentTypeParams: string,
  path: string,
  body: any,
  query: {[key: string]: string}
  files: filesHandler,
  server: any
}

export interface routeContract {
  prefixArr: string[]
  prefix(path: string): this
  middlewares: string[]
  middleware(name: string | string[]): this

  method: requestMethods
  path: string
  controller: string | ((context: HttpContextContract) => Promise<any>)
}

export interface routeGroupContract {
  contracts: (routeContract | routeGroupContract)[]
  prefix(path: string): this
  middleware(name: string | string[]): this
}

export type bodiesTypes = number | string | object;

export interface httpRequestContract {
  req: any,
  contentType: headerContentTypes,
  body: any,
  query: {[key: string]: string}
  filesArr: filesHandler
  all(): {[key: string]: any}
  header(key: string): string
  files(): filesHandler
}

export interface httpResponseContract {
  statusCode?: number
  body?: bodiesTypes
  headersArr: [headerKeys, headerContentTypes, ...string[]][];
  status(code: number): this
  send(body: bodiesTypes): this
  header(key: headerKeys, value: headerContentTypes, extra?: string): this
}

export interface HttpContextContract extends newRequestContract {
  response: httpResponseContract
  request: httpRequestContract
  log: logContract
  params: {[key: string]: string | string[]}
}

export type middlewareContract = {
  isGlobal?: boolean
  priority?: number
  handle: (context: HttpContextContract, next: () => Promise<any>) => Promise<any>
};

export interface routeMethodImpContract {
  params: string[]
  exec(context: HttpContextContract): Promise<any>
}

export type routeImpContract = {
  implement: {
    [method in requestMethods]?: routeMethodImpContract[]
  }
  implementDefault: {
    [method in requestMethods]?: routeMethodImpContract
  }
  sub: {[pathPiece: string]: routeImpContract}
}

export interface routeHandlerContract {
  routes: routeImpContract
  routesSetings: routeContract[]

  solveRoutes(): this

  group(contracts: (routeContract | routeGroupContract)[]): routeGroupContract
  get(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract
  post(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract
  put(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract
  delete(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract
  patch(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract
}
