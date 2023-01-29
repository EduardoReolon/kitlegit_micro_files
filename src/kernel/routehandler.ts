import {routeContract, requestMethods, routeHandlerContract, routeImpContract, routeGroupContract,
  HttpContextContract, routeMethodImpContract} from '../contracts/requestsContracts';
import {namedMiddlewares} from './middlewares';

function route({path, controller, method, routesSetings}: {
  path: string, controller: string | ((context: HttpContextContract) => Promise<any>),
  method: requestMethods, routesSetings: routeContract[]}): routeContract {

  const obj: routeContract = {
    prefixArr: [],
    prefix(path: string) {
      if (path) obj.prefixArr.unshift(...path.split(/\/|\\/).filter((str) => str));
      return obj;
    },
    middlewares: [],
    middleware(name: string | string[]): routeContract {
      const include = (currentName: string) => {
        if (!this.middlewares.includes(currentName)) this.middlewares.unshift(currentName);
      }
      if (typeof name === 'string') include(name);
      else name.slice(0).reverse().forEach(include);
      return this;
    },
    method,
    path: path.replace(/^\/|\/$/g, ''),
    controller
  }
  routesSetings.push(obj);

  return obj;
}

class RouteHandler implements routeHandlerContract {
  routes: routeImpContract = {
    implement: {},
    implementDefault: {},
    sub: {},
  }
  routesSetings: routeContract[] = []

  solveRoutes() {
    const globalMiddlewares: {name: string, priority: number}[] = Object.keys(namedMiddlewares).map((mName) => {
      if (namedMiddlewares[mName].isGlobal) return {name: mName, priority: namedMiddlewares[mName].priority || 10};
      return {name: '', priority: 100};
    }).filter((m) => m.name).sort((a, b) => b.priority - a.priority); // descent order

    const implement = (obj: routeContract) => {
      const fullPathArr= [...obj.prefixArr, ...obj.path.split('/')].filter((str) => str);
      const paramIndexSt = fullPathArr.findIndex((str) => str.startsWith(':'));
      const params: string[] = [];
      if (paramIndexSt > -1) {
        if (fullPathArr.slice(paramIndexSt).some((p) => !p.startsWith(':'))) throw new Error('Params errors');
        params.push(...fullPathArr.splice(paramIndexSt).map((str) => str.replace(/^:+/, '')));
      }
      if (fullPathArr.includes('*')) {
        if (fullPathArr.filter((p) => p === '*').length > 1) throw new Error(`Route ${fullPathArr.join('/')} with more than one "*"`);
        if (fullPathArr.indexOf('*') !== fullPathArr.length - 1) throw new Error('"*" misplaced');
      }

      const getRouteObj = (obj: routeImpContract, str: string) => {
        if (str === '*') return obj;
        if (!obj.sub[str]) obj.sub[str] = {implement: {}, implementDefault: {}, sub: {}};
        return obj.sub[str];
      }
      const routeObj = fullPathArr.reduce(getRouteObj, this.routes);

      let funcTarget: (context: HttpContextContract) => Promise<any>;
      if (typeof obj.controller === 'string') {
        const controllerPath = obj.controller.split('.');
        const controllerFunc = controllerPath.pop();
        if (!controllerFunc) throw new Error('No function specified');
        async function evoqueController() {
          const controller = new (await import(`../app/Controllers/Http/${controllerPath.join('/')}`)).default();
          if (!controllerFunc) return;
          if (!controller[controllerFunc]) throw new Error(`Function not found in controller (${obj.controller})`);
          funcTarget = controller[controllerFunc];
        }
        evoqueController();
      } else funcTarget = obj.controller;

      // middlewares
      globalMiddlewares.forEach((gMiddleware) => {
        const index = obj.middlewares.indexOf(gMiddleware.name);
        if (index > -1) obj.middlewares.splice(index, 1);
      });
      for (const gMiddleware of globalMiddlewares) {
        obj.middlewares.unshift(gMiddleware.name);
      }
      for (const middlewareName of obj.middlewares) {
        if (!namedMiddlewares[middlewareName]) throw new Error(`${middlewareName} Middleware not found`);
      }

      const objImplement: routeMethodImpContract = {
        params,
        async exec(context: HttpContextContract) {
          const exec = [async () => await funcTarget(context)];
          for (const middlewareName of obj.middlewares) {
            const next = exec[0];
            exec.unshift(async () => await namedMiddlewares[middlewareName].handle(context, next));
          }
          await exec[0]();
        }
      }

      if (fullPathArr[fullPathArr.length - 1] === '*') {
        if (routeObj.implementDefault[obj.method]) throw new Error(`Route ${fullPathArr.join('/')} already implemented`);
        routeObj.implementDefault[obj.method] = objImplement;
      } else {
        if (!routeObj.implement[obj.method]) routeObj.implement[obj.method] = [];
        routeObj.implement[obj.method]?.push(objImplement);
      }
    }
    this.routesSetings.forEach(implement);
    return this;
  }

  group(contracts: (routeContract | routeGroupContract)[]): routeGroupContract {
    const obj: routeGroupContract = {
      contracts,
      prefix(path): routeGroupContract {
        this.contracts.forEach((contract) => {
          contract.prefix(path);
        });
        return this;
      },
      middleware(name: string): routeGroupContract {
        this.contracts.forEach((contract) => {
          contract.middleware(name);
        });
        return this;
      }
    };
    return obj;
  }

  get(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract {
    return route({path, controller, method: 'GET', routesSetings: this.routesSetings});
  }

  post(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract {
    return route({path, controller, method: 'POST', routesSetings: this.routesSetings});
  }

  put(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract {
    return route({path, controller, method: 'PUT', routesSetings: this.routesSetings});
  }

  delete(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract {
    return route({path, controller, method: 'DELETE', routesSetings: this.routesSetings});
  }

  patch(path: string, controller: string | ((context: HttpContextContract) => Promise<any>)): routeContract {
    return route({path, controller, method: 'PATCH', routesSetings: this.routesSetings});
  }
}

const Route = new RouteHandler();
export default Route;
