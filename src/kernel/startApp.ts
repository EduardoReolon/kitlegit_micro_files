import { headerContentTypes } from "../contracts/requestsContracts";
import { loadMiddlewares } from "./middlewares";
import { env, loadEnv, setEnvDir } from "./env";

const express = require('express');
const bodyParser = require('body-parser');
const upload = require('./fileshandler');
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse various different custom JSON types as JSON
app.use(bodyParser.json())

// parse some custom thing into a Buffer
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }))

// parse an HTML body into a string
app.use(bodyParser.text({ type: 'text/html' }))
app.use(bodyParser.text({ type: 'text/plain' }))

// for parsing multipart/form-data
app.use(upload.any())

export default async function ({dir, filesMiddleware, startRoutes}:
  {
    dir: string,
    filesMiddleware: {name: string, path: string}[],
    startRoutes(): Promise<unknown>
  }) {

  setEnvDir(dir);
  await loadEnv();
  await loadMiddlewares(filesMiddleware);
  await startRoutes();
  const NewRequest = (await import('./newrequesthandler')).default;

  app.all('*', async (req: any, res: any) => {
    const contentTypeArray: [headerContentTypes, string | undefined] = (req.headers['content-type'] || '').split('; ');

    await new NewRequest({
      req, res,
      method: req.method,
      contentType: contentTypeArray[0],
      contentTypeParams: contentTypeArray[1] || '',
      path: req.path,
      body: req.body,
      query: req.query,
      files: req.files,
    }).launch();
  })

  app.listen(env.PORT, () => {
    console.log(`Listening on port ${env.PORT}`)
  })
}
