import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";
import Log from "../services/log";

const queue: {
  called: boolean,
  callNext: () => void
}[] = [];

export default class AuthMiddleware implements middlewareContract {
  isGlobal: boolean = true;
  priority: number = 3; // 0-10

  requestFinished() {
    queue.shift();
    for (const iterator of queue) {
      if (iterator.called === false) iterator.callNext(); break;
    }
  }

  public async handle(ctx: HttpContextContract, next: () => Promise<void>) {
    const putOnHold = queue.length >= 1;

    const nextForQueue = new Promise((resolve) => {
      queue.push({
        called: !putOnHold,
        callNext() {
          this.called = true;
          resolve('');
        }
      });
    })
    if (putOnHold) await nextForQueue;

    try {
      // new Log({route: 'queue antes'}).save();
      await next();
      // new Log({route: 'queue depois'}).save();
      this.requestFinished();
    } catch (error) {
      this.requestFinished();
      throw error;
    }
  }
}
