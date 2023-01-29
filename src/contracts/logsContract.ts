export type sideData = {[key: string]: string | number | string[]};
export interface logRecordContract {
  user_id?: number
  method?: string
  route?: string
  response_status?: number
  error_message?: string
  error_stack?: string
  time?: number

  // json fields
  request?: string
  response?: string
  params?: string
  side_data?: string
}

export interface logContract {
  timeStart: number;
  // public log: Log;
  // log: {[key: string]: string | number | string[]}
  log: logRecordContract
  response?: any
  sideData: sideData
  request: { [key: string]: any; } | undefined
  params: { [key: string]: string | string[]; } | undefined

  setRequest({request, params}: {request: {[key: string]: any}, params: {[key: string]: string | string[]}}): this

  setUser_id(user_id: number): this

  setResponse ({status, response}: {status?: number, response?: any}): this

  setSideData (sideData: sideData): this

  setError (error: Error | string | {[key: string]: string | number} | number): this

  finishLog(): this

  save(skipNewLogOnError?: boolean): Promise<unknown>
}
