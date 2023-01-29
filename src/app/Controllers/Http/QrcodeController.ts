import { HttpContextContract } from "../../../contracts/requestsContracts";
import QRCode from "../../Helpers/qrcode";

export default class {
  public async store({request, response}: HttpContextContract) {
    const requestAll = request.all();

    const responseQrcode = await QRCode.toFile({...requestAll});

    if (!responseQrcode || responseQrcode !== 'generated') return response.status(400).send({msg: 'error generating QRCode'});

    response.status(200);
  }
}
