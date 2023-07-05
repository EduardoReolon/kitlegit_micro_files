import { HttpContextContract } from "../../../contracts/requestsContracts";
import Helpers from "../../Helpers";
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
    const {relPath} = request.all() as {relPath: string};

    response.status(200).send(await Helpers.getDataFromPhoto({relPath}));
  }

  public async testing({request, response}: HttpContextContract) {
    const {args} = request.all() as {args: string[]};
    const {stdout, stderr } = await Python.call({args});
    response.status(200).send({stdout, stderr});
  }
}
