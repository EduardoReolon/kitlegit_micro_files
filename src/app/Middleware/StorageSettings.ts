import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";
import Storage from "../services/storage";

export default class StorageSettingsMiddleware implements middlewareContract {
  priority = 8;
  isGlobal: boolean = true;

  public async handle({request}: HttpContextContract, next: () => Promise<void>) {
    const storageSettings = request.header('storagesettings');
    if (storageSettings) {
      Storage.setSettings(JSON.parse(storageSettings));
    }

    await next();
  }
}
