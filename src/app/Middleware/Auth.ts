import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";
import Log from "../services/log";

export default class AuthMiddleware implements middlewareContract {
  isGlobal: boolean = false;
  priority: number = 4; // 0-10

  public async handle({}: HttpContextContract, next: () => Promise<void>) {
    new Log({route: 'auth antes'}).save();
    await next();
    new Log({route: 'auth depois'}).save();
  }
}
