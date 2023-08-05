import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";

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
    const simultaneousRequests = 2;
    const nextForQueue = new Promise((resolve) => {
      queue.push({
        called: false,
        callNext() {
          this.called = true;
          resolve('');
        }
      });
    })
    if (queue.length > simultaneousRequests) await nextForQueue;

    try {
      await next();
      this.requestFinished();
    } catch (error) {
      this.requestFinished();
      throw error;
    }
  }
}
