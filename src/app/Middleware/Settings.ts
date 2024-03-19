import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";
import Api from "../services/api";
import Storage from "../services/storage";

export default class SettingsMiddleware implements middlewareContract {
  priority = 8;
  isGlobal: boolean = true;

  public async handle({request}: HttpContextContract, next: () => Promise<void>) {
    const storageSettings = request.header('storagesettings');
    const apiSettings = request.header('apisettings');
    if (storageSettings) {
      Storage.setSettings(JSON.parse(storageSettings));
    }
    if (apiSettings) {
      Api.settings = JSON.parse(apiSettings);
    }

    await next();
  }
}
