import Helpers from ".";
import AwsS3 from "../services/awsS3";

export default class QRCode {
  static async toFile({
    QRdata = '',
    relPath = '',
    dark = '#000000',  // black
    light = '#0000' // Transparent background
  } = {}) {
    const QRCode = require('qrcode') // https://github.com/soldair/node-qrcode

    if (!relPath) return;

    const options = {color: {dark, light}};

    let response: string | undefined;
    try {
      await new Promise(async (resolve, reject) => {
        try {
          if (AwsS3.isActive()) {
            const buffer = await QRCode.toBuffer(QRdata, options);
            await new AwsS3({key: relPath}).upload({buffer, storageClass: 'REDUCED_REDUNDANCY'});
            resolve('generated');
          } else {
            QRCode.toFile(Helpers.storageRoot(relPath), QRdata, options, (error: any, _str: any) => {
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
}
