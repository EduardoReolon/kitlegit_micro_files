import { HttpContextContract } from "../../../contracts/requestsContracts";
import Barcode from "../../Helpers/barcode";

export default class {
  public async getFromImg({request, response}: HttpContextContract) {
    const {relPath} = request.all();

    response.status(200).send(await Barcode.getFromPhoto({relPath}));
  }
}
