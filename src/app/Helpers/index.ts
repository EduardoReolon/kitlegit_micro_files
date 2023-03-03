import { env } from "../../kernel/env";
import AwsS3 from "../services/awsS3";
import Log from "../services/log";
const fs = require('fs');
import { htmlToPdf } from 'convert-to-pdf'; // https://github.com/sankalpkataria/to-pdf
import sharp from "sharp";
import { awsS3StorageClasses } from "../interfaces";

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

  static async readImgSharp({ relPath }: { relPath: string }) {
    if (AwsS3.isActive()) {
      const file = await new AwsS3({ key: relPath }).download({ type: 'buffer' });
      if (!file) throw 'Error downloading file from AWS S3';

      return sharp(file as Buffer, { failOnError: false }).rotate();
    } else {
      return sharp(fs.readFileSync(Helpers.storageRoot(relPath)), { failOnError: false });
    }
  }

  static async getFileBuffer(relPath: string): Promise<Buffer | boolean> {
    if (AwsS3.isActive()) {
      const buffer = await new AwsS3({ key: relPath }).download({ type: 'buffer' });
      if (!buffer) return false;
      return buffer as Buffer;
    } else if (fs.existsSync(Helpers.storageRoot(relPath))) return fs.readFileSync(Helpers.storageRoot(relPath));

    return false;
  }

  static async imgCropSharp({ img }: { img: sharp.Sharp }) {
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
      position: 'top',
    });
    return sharp((await img.toBuffer({ resolveWithObject: true })).data, { failOnError: false });
  }

  static async saveImgSharp({ relPath, file, storageClass = 'REDUCED_REDUNDANCY' }: { relPath: string, file: sharp.Sharp, storageClass?: awsS3StorageClasses }) {
    if (AwsS3.isActive()) {
      const buffer = await file.toBuffer();
      await new AwsS3({ key: relPath }).upload({ storageClass, buffer });
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

  static async imgResizeSharp({ relPath, resizedRelPath, maxResolution = 124, storageClass = 'REDUCED_REDUNDANCY' }: { relPath: string, resizedRelPath?: string, maxResolution?: number, storageClass?: awsS3StorageClasses }) {
    if (!resizedRelPath) resizedRelPath = relPath;

    try {
      const original = await Helpers.imgCropSharp({ img: await Helpers.readImgSharp({ relPath }) });
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
      if (AwsS3.isActive()) {
        await new AwsS3({ key: `${relPath}/${fileName}.pdf` }).upload({ buffer: pdfBuffer });
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
}
