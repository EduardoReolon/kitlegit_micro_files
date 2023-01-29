import { HttpContextContract } from "../../../contracts/requestsContracts";
import Helpers from "../../Helpers";

export default class {
  public async store({request, response}: HttpContextContract) {
    const requestAll = request.all();

    await Helpers.generatePDF({relPath: requestAll.relPath, fileName: requestAll.fileName, url: requestAll.url});

    response.status(200);
  }
}
