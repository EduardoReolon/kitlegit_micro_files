import { env } from "../../kernel/env";
import Storage from "../services/storage";
import Log from "../services/log";
const fs = require('fs');
import { htmlToPdf } from 'convert-to-pdf'; // https://github.com/sankalpkataria/to-pdf
import sharp from "sharp";
import { awsS3StorageClasses } from "../interfaces";
import Jimp from 'jimp';
import Python from "../services/python";

let imgIndex = 0;

export default class Helpers {
  // both without / at the end
  static appRoot(path: string = '') {
    const end = path ? `/${path.replace(/^\/|\/$/g, '')}` : '';
    return `${env.baseDir}${end}`;
  }
  static storageRoot(path: string = '') {
    const end = path ? `/${path.replace(/^\/|\/$/g, '')}` : '';
    if (env.storage_root) return `${env.storage_root}${end}`;
    return Helpers.appRoot(`storage${end}`);
  }

  static async readImgJimp({ relPath }: { relPath: string }) {
    if (Storage.isActive()) {
      const file = await new Storage({ key: relPath }).download({ type: 'buffer' });
      if (!file) throw 'Error downloading file from storage';

      try {
        const jo = require('jpeg-autorotate');
        const { buffer } = await jo.rotate(file, { quality: 30 });
        return await Jimp.read(buffer);
      } catch (error) {
        return await Jimp.read(file as Buffer);
      }
    } else {
      try {
        const fileIn = fs.readFileSync(relPath);
        const jo = require('jpeg-autorotate');
        const { buffer } = await jo.rotate(fileIn, { quality: 30 });
        return await Jimp.read(buffer);
      } catch (error) {
        return await Jimp.read(relPath);
      }
    }
  }

  static async readImgSharp({ relPath }: { relPath: string }) {
    if (Storage.isActive()) {
      const file = await new Storage({ key: relPath }).download({ type: 'buffer' });
      if (!file) throw 'Error downloading file from storage';

      return sharp(file as Buffer, { failOnError: false }).rotate();
    } else {
      return sharp(fs.readFileSync(Helpers.storageRoot(relPath)), { failOnError: false });
    }
  }

  static sharpFromBuffer(buffer: Buffer) {
    return sharp(buffer);
  }

  static async getFileBuffer(relPath: string): Promise<Buffer | boolean> {
    if (Storage.isActive()) {
      const buffer = await new Storage({ key: relPath }).download({ type: 'buffer' });
      if (!buffer) return false;
      return buffer as Buffer;
    } else if (fs.existsSync(Helpers.storageRoot(relPath))) return fs.readFileSync(Helpers.storageRoot(relPath));

    return false;
  }

  static async imgCropSharp({ img, imageCentered }: { img: sharp.Sharp, imageCentered?: boolean }) {
    const meta = await img.metadata();
    const height = meta.height || 1000;
    const width = meta.width || 1000;
    let w, h;
    if (height > width) {
      w = width;
      h = width;
    } else {
      w = height;
      h = height;
    }
    img.resize(Math.round(w), Math.round(h), {
      position: imageCentered ? undefined : 'top',
    });
    return sharp((await img.toBuffer({ resolveWithObject: true })).data, { failOnError: false });
  }

  static async saveImgSharp({ relPath, file, storageClass = 'REDUCED_REDUNDANCY' }: { relPath: string, file: sharp.Sharp, storageClass?: awsS3StorageClasses }) {
    if (Storage.isActive()) {
      const buffer = await file.toBuffer();
      await new Storage({ key: relPath }).upload({ storageClass, buffer });
    } else file.write(Helpers.storageRoot(relPath));
  }

  static async imgSquareToDataURL({ relPath }: { relPath: string }) {
    return await Helpers.fileToDataURL({ dataType: 'image/jpg', relPath });
  }

  static async imgRedizeSharpCore({ img, maxResolution }: { img: sharp.Sharp, maxResolution: number }) {
    const meta = await img.metadata();
    const height = meta.height || 1000;
    const width = meta.width || 1000;

    let widthNew;
    if (Math.max(height, width) < maxResolution) widthNew = width;
    else if (height > width) widthNew = width * (maxResolution / height);
    else widthNew = maxResolution;

    img.resize(Math.round(widthNew));
  }

  static async imgResizeSharp({
    relPath, resizedRelPath, maxResolution = 124, storageClass = 'REDUCED_REDUNDANCY', rotate,
    orientation, imageCentered
  }: {
    relPath: string, resizedRelPath?: string, maxResolution?: number, storageClass?: awsS3StorageClasses, rotate?: boolean,
    orientation: 'portraitUp' | 'landscapeRight' | 'landscapeLeft' | 'portraitDown', imageCentered?: boolean
  }) {
    if (!resizedRelPath) resizedRelPath = relPath;

    try {
      let img = await Helpers.readImgSharp({ relPath });
      const start = new Date();
      if (rotate) {
        if (orientation === 'landscapeLeft') {
          img = sharp(await sharp(await img.toBuffer()).rotate(90).toBuffer());
        } else if (orientation === 'landscapeRight') {
          img = sharp(await sharp(await img.toBuffer()).rotate(270).toBuffer());
        } else if (orientation === 'portraitDown') {
          img = sharp(await sharp(await img.toBuffer()).rotate(180).toBuffer());
        } else {
          const { width, height } = await img.metadata();
          if ((width || 0) > (height || 0)) {
            img = sharp(await sharp(await img.toBuffer()).rotate(90).toBuffer());
          }
        }
      }
      const original = await Helpers.imgCropSharp({ img, imageCentered });
      await Helpers.imgRedizeSharpCore({ img: original, maxResolution });
      await Helpers.saveImgSharp({ relPath: resizedRelPath, file: original, storageClass });
    } catch (error) {
      new Log({ route: 'Helpers.imgResizeSharp' }).setError(error as Error).setResponse({ status: 58 }).save();
    }
  }

  static async fileToDataURL({ dataType = 'image/png', relPath }: { dataType?: string, relPath?: string }) {
    if (!relPath) return '';
    const qrCode = await Helpers.getFileBuffer(relPath);
    if (typeof qrCode === 'boolean') return '';
    return `data:${dataType};base64,${Buffer.from(qrCode).toString('base64')}`;
  }

  static async generatePDF({ relPath, fileName, url = 'certificate' }:
    { relPath: string, fileName: string, url: string }) {

    /**
     * ATENTION
     * PUPPETEER may throw an error due to chromium
     * add these two lines in .env file
     * PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
     * PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
     *
     * to install chromium on linux ubuntu
     * https://www.edivaldobrito.com.br/como-instalar-o-navegador-chromium-no-ubuntu-20-04-deb/
     */

    const options = {
      url: {
        link: url
      }
    };
    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await htmlToPdf(options as any);
    } catch (error: any) {
      new Log({ route: 'creating pdf buffer' }).setError(error).setResponse({ status: 11 }).save();
      throw new Error('error creating pdf buffer');
    }

    if (!pdfBuffer) throw new Error('Unable to create PDF buffer');
    try {
      if (Storage.isActive()) {
        await new Storage({ key: `${relPath}/${fileName}.pdf` }).upload({ buffer: pdfBuffer });
      } else {
        fs.writeFile(`${Helpers.storageRoot(relPath)}/${fileName}.pdf`, pdfBuffer, "binary", (errFs: any) => {
          if (errFs) {
            new Log({ route: 'write pdf file local' }).setError(errFs).setSideData({ place: 'writeFile' }).setResponse({ status: 16 }).save();
          }
        });
      }
    } catch (error: any) {
      new Log({ route: 'catch in pdf write' }).setError(error).setSideData({ place: 'catch writeFile' }).setResponse({ status: 17 }).save()
    }
  }

  static async getDataFromPhoto({relPath, coefWidth}: {relPath: string, coefWidth: number}) {
    const args = [
      '--target img',
      '--func dataExtraction',
      `--relPath ${relPath}`,
      `--imgIndex ${imgIndex}`
    ];
    if (coefWidth) args.push(`--coefWidth ${coefWidth}`);
    const {stdout, stderr } = await Python.call({args});
    imgIndex = imgIndex === 9 ? 0 : imgIndex + 1;
    if (stderr) new Log({ route: 'getDataFromPhoto' }).setError(stderr).save();

    const dataReturn: {barcodes: string[], qrcodes: string[], facts: string[]} = {barcodes: [], qrcodes: [], facts: []};

    try {
      if (stdout && stdout.length) {
        const obj = JSON.parse(stdout) as {barqrcodes: {data: string, type: 'QRCODE' | 'CODE128' | 'anyOther'}[], facts: string[]};
        for (const barQr of obj.barqrcodes) {
          if (barQr.type === 'QRCODE') dataReturn.qrcodes.push(barQr.data);
          else dataReturn.barcodes.push(barQr.data);
        }
        for (const fact of obj.facts) {
          if (fact.length) dataReturn.facts.push(fact.replace(/\n/g, ' '));
        }
      }
    } catch (error) {
      new Log({route: 'getDataFromPhoto tryCatch'}).setError(error as Error).save();
    }

    return dataReturn;
  }
}
