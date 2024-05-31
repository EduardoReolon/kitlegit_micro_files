import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";

export default class AuthMiddleware implements middlewareContract {
  isGlobal: boolean = false;
  priority: number = 4; // 0-10

  public async handle({}: HttpContextContract, next: () => Promise<void>) {
    await next();
  }
}
