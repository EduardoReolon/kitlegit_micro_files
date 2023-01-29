import { HttpContextContract } from "../../../contracts/requestsContracts";

export default class AuthController {
  public async me({}: HttpContextContract) {
    console.log('authcontroller me');
  }

  public async update({params}: HttpContextContract) {
    console.log('authcontroller update', params);
  }
}
