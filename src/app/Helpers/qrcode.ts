import Helpers from ".";
const jsQR = require("jsqr"); // https://github.com/cozmo/jsQR
import AwsS3 from "../services/awsS3";
const QRCodeWriter = require('qrcode') // https://github.com/soldair/node-qrcode
import Jimp from 'jimp';

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

  static async getFromPhoto({relPath, maxResolution = 768}: {relPath: string, maxResolution?: number}): Promise<string[]> {
    const values: string[] = [];

    // const sharp = await Helpers.readImgSharp({relPath});
    // const sharpMeta = await sharp.metadata();
    // const width = sharpMeta.width || 1000;
    // const height = sharpMeta.height || 1000;
    // if (width > maxResolution || height > maxResolution) {
    //   if (width > height) sharp.resize(maxResolution, Math.round(height / width * maxResolution));
    //   else sharp.resize(Math.round(width / height * maxResolution), maxResolution);
    // }

    // const {data, info} = await sharp
    //   .ensureAlpha()
    //   .raw()
    //   .toBuffer({resolveWithObject: true});

    // const code = jsQR(new Uint8ClampedArray(data.buffer), info.width, info.height);

    // if (code) {
    //   values.push(code.data);
    // }

    const jimpOriginal = await Helpers.readImgJimp({relPath});

    const getCropped = async (type: 'center' | 'center strip', scale: number, posMultY: number = 0) => {
      const jimp = await Jimp.read(jimpOriginal);
      let w = 1000, h = 1000, x = 0, y = 0;
      if (type === 'center') {
        w = Math.round(jimp.getWidth() / scale);
        h = Math.round(jimp.getHeight() / scale);
        x = Math.round((jimp.getWidth() - w) / 2);
        y = Math.round((jimp.getHeight() - h) / 2);
      } else if (type === 'center strip') {
        w = Math.floor(jimp.getWidth() / scale);
        h = Math.floor(jimp.getHeight() / scale);
        x = Math.floor((jimp.getWidth() - w) / 2);
        y = h * posMultY;
      }
      jimp.crop(x, y, w, h);

      const code = jsQR(jimp.bitmap.data as any, w, h);

      if (code) {
        values.push(code.data);
      }
    }

    await getCropped('center', 2);
    if (!values.length) await getCropped('center', 1.5);
    if (!values.length) await getCropped('center', 1);
    if (!values.length) await getCropped('center strip', 2, 0);
    if (!values.length) await getCropped('center strip', 2, 1);
    if (!values.length) await getCropped('center strip', 3, 0);
    if (!values.length) await getCropped('center strip', 3, 1);
    if (!values.length) await getCropped('center strip', 3, 2);

    return values;
  }
}
