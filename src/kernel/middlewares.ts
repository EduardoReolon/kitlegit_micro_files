import { middlewareContract } from "../contracts/requestsContracts";

const namedMiddlewares: {[name: string]: middlewareContract} = {};

async function loadMiddlewares(files: {name: string, path: string}[]) {
  for (const file of files) {
    namedMiddlewares[file.name] = new (await import(file.path)).default();
  }
}

export {
  namedMiddlewares,
  loadMiddlewares
};
