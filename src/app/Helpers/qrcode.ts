import Helpers from ".";
const jsQR = require("jsqr"); // https://github.com/cozmo/jsQR
import AwsS3 from "../services/awsS3";
const QRCodeWriter = require('qrcode') // https://github.com/soldair/node-qrcode

export default class QRCode {
  static async toFile({
    QRdata = '',
    relPath = '',
    dark = '#000000',  // black
    light = '#0000' // Transparent background
  } = {}) {
    if (!relPath) return;

    const options = {color: {dark, light}};

    let response: string | undefined;
    try {
      await new Promise(async (resolve, reject) => {
        try {
          if (AwsS3.isActive()) {
            const buffer = await QRCodeWriter.toBuffer(QRdata, options);
            await new AwsS3({key: relPath}).upload({buffer, storageClass: 'REDUCED_REDUNDANCY'});
            resolve('generated');
          } else {
            QRCodeWriter.toFile(Helpers.storageRoot(relPath), QRdata, options, (error: any, _str: any) => {
              if (error) {
                console.error(error);
                reject();
                return;
              }
              resolve('generated');
            })
          }
        } catch (error) {reject()}
      }).then((data) => {
        response = data as string;
      });
    } catch (error) {
      throw error;
    }
    return response;
  }

  static async getFromPhoto({relPath}: {relPath: string}): Promise<string[]> {
    const values: string[] = [];

    const jimp = await Helpers.readImgJimp({relPath});

    const code = jsQR(jimp.bitmap.data, jimp.getWidth(), jimp.getHeight());

    if (code) {
      values.push(code.data);
    }

    return values;
  }
}
