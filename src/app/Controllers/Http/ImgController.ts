import { HttpContextContract } from "../../../contracts/requestsContracts";
import Helpers from "../../Helpers";
import Watermark from "../../services/watermark";

export default class {
  public async resize({request, response}: HttpContextContract) {
    const requestAll = request.all();

    await Helpers.imgResizeSharp(requestAll as any);

    response.status(200);
  }

  public async watermark({request, response}: HttpContextContract) {
    const requestAll = request.all();

    await Watermark.addWatermark(requestAll.relPath, requestAll.watermarkRelPath, requestAll.certificateCode);

    response.status(200);
  }

  public async squareToDataURL({request, response}: HttpContextContract) {
    const requestAll = request.all();

    response.status(200).send(await Helpers.imgSquareToDataURL(requestAll as any));
  }
}
