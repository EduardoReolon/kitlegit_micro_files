import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";
import AwsS3 from "../services/awsS3";

export default class AwsS3SettingsMiddleware implements middlewareContract {
  isGlobal: boolean = false;

  public async handle({request}: HttpContextContract, next: () => Promise<void>) {
    const awsS3Settings = request.header('awss3settings');
    if (awsS3Settings) {
      AwsS3.setSettings(JSON.parse(awsS3Settings));
    }

    await next();
  }
}
