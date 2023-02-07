import Helpers from ".";
import Log from "../services/log";

var Quagga = require('quagga').default;

export default class Barcode {
  static async getFromPhoto({ relPath }: { relPath: string }): Promise<string[]> {
    const values: string[] = [];

    const img = await Helpers.fileToDataURL({ dataType: 'image/jpg', relPath });

    await new Promise((resolve, reject) => {
      try {
        Quagga.decodeSingle({
          src: img,
          numOfWorkers: 0,  // Needs to be 0 when used within node
          decoder: {
            readers: [
              'ean_reader', 'code_128_reader', 'ean_8_reader', 'code_39_reader',
              'code_39_vin_reader', 'codabar_reader', 'upc_reader', 'upc_e_reader',
              'i2of5_reader', '2of5_reader', 'code_93_reader'
            ], // List of active readers
            multiple: true,
          },
        }, function (result: any) {
          // [{codeResult: {code: string}}]
          if (Array.isArray(result)) {
            result.forEach((codeObj) => {
              if (codeObj.codeResult && codeObj.codeResult.code) values.push(codeObj.codeResult.code);
            })
          }
          resolve('');
        });
      } catch (error) {
        reject(error);
      }
    }).then(() => { })
      .catch((error) => {
        new Log({ route: 'barcode getFromPhoto' }).setError(error).save();
      });

    return values;
  }
}
