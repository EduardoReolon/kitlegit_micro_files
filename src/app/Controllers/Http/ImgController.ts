import { HttpContextContract } from "../../../contracts/requestsContracts";
import Helpers from "../../Helpers";
import { enginesTypes } from "../../interfaces";
import Python from "../../services/python";
import Storage from "../../services/storage";
import Watermark from "../../services/watermark";

export default class {
  public async resize({request, response}: HttpContextContract) {
    const requestAll = request.all();

    await Helpers.imgResizeSharp(requestAll as any);

    response.status(200);
  }

  public async watermark({request, response}: HttpContextContract) {
    const requestAll = request.all();

    await Watermark.addWatermark(requestAll as any);

    response.status(200);
  }

  public async squareToDataURL({request, response}: HttpContextContract) {
    const requestAll = request.all();

    response.status(200).send(await Helpers.imgSquareToDataURL(requestAll as any));
  }

  public async testStorage({request, response}: HttpContextContract) {
    const {key, keyTo} = request.all();
    const storage = new Storage({key});

    if (!(await storage.exists())) return response.status(400).send({msg: 'file doesn\'t exists'});
    if (!(await storage.download())) return response.status(400).send({msg: 'file not downloaded'});
    if (!(await storage.copy({keyTo}))) return response.status(400).send({msg: 'file not copied'});
  }

  public async getData({request, response}: HttpContextContract) {
    const {relPath, resizedRelPath, maxResolution, coefWidth, coefHight,
      tesseract, size, sizeQrcode, anglesCount, angles, hasQrcode, hasBarcode, hasFact, engine, maxSizeKb, maxSizePx,
      getJapaneseChars
    } = request.all() as {
      relPath: string, resizedRelPath?: string, maxResolution?: number, coefWidth: number,
      coefHight: number, tesseract: boolean, size: number, sizeQrcode: number, anglesCount: number,
      angles: number[], hasQrcode?: boolean, hasBarcode?: boolean, hasFact?: boolean, engine: enginesTypes,
      maxSizeKb: number, maxSizePx: number, getJapaneseChars?: boolean
    };

    response.status(200).send(await Helpers.getDataFromPhoto({
      relPath, resizedRelPath, maxResolution, coefWidth, coefHight,
      tesseract, size, sizeQrcode, anglesCount, angles, hasQrcode, hasBarcode, hasFact, engine,
      maxSizeKb, maxSizePx, getJapaneseChars
    }));
  }

  public async testing({request, response}: HttpContextContract) {
    const {args, method} = request.all() as {args: string[], method: 'socket' | 'spawn' | undefined};
    const {stdout, stderr } = await Python.call({args, method});
    response.status(200).send({stdout, stderr});
  }
}
