const Jimp = require('jimp');
import { env } from "../../kernel/env";
import AwsS3 from "../services/awsS3";
import Log from "../services/log";
const fs = require('fs');
const html_to_pdf = require('html-pdf-node');

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
    if (AwsS3.isActive()) {
      const file = await new AwsS3({key: relPath}).download({type: 'buffer'});
      if (!file) throw 'Error downloading file from AWS S3';

      try {
        const jo = require('jpeg-autorotate');
        const { buffer } = await jo.rotate(file, { quality: 30 });
        return await Jimp.read(buffer);
      } catch (error) {
        return await Jimp.read(file as Buffer);
      }
    } else {
      try {
        const fileIn = fs.readFileSync(Helpers.storageRoot(relPath));
        const jo = require('jpeg-autorotate');
        const { buffer } = await jo.rotate(fileIn, { quality: 30 });
        return await Jimp.read(buffer);
      } catch (error) {
        return await Jimp.read(Helpers.storageRoot(relPath));
      }
    }
  }

  static async getFileBuffer(relPath: string): Promise<Buffer | boolean> {
    if (AwsS3.isActive()) {
      const buffer = await new AwsS3({key: relPath}).download({type: 'buffer'});
      if (!buffer) return false;
      return buffer as Buffer;
    } else if (fs.existsSync(Helpers.storageRoot(relPath))) return fs.readFileSync(Helpers.storageRoot(relPath));

    return false;
  }

  static imgCrop({ img }: { img: any }) {
    const height = img.getHeight();
    const width = img.getWidth();
    let x, y, w, h;
    if (height > width) {
      x = 0;
      y = (height - width) / 2;
      w = width;
      h = width;
    } else {
      x = (width - height) / 2;
      y = 0;
      w = height;
      h = height;
    }
    img.crop(x, y, w, h);
  }

  static async saveImgJimp({ relPath , file }: {relPath: string, file: any}) {
    if (AwsS3.isActive()) {
      const buffer = await file.getBufferAsync(file.getMIME());
      await new AwsS3({key: relPath}).upload({storageClass: 'REDUCED_REDUNDANCY', buffer});
    } else file.write(Helpers.storageRoot(relPath));
  }

  static async imgSquareToDataURL({ relPath }: { relPath: string }) {
    const img = await Helpers.readImgJimp({ relPath });
    Helpers.imgCrop({ img });
    return await img.getBase64Async(img.getMIME());
  }

  static async imgResize({ relPath, resizedRelPath, maxResolution = 360, qualityImage = 60 }: { relPath: string, resizedRelPath?: string, maxResolution?: number, qualityImage?: number }) {
    if (!resizedRelPath) resizedRelPath = relPath;
    const original = await Helpers.readImgJimp({ relPath });
    Helpers.imgCrop({ img: original });
    const height = original.getHeight();
    const width = original.getWidth();

    let widthNew;
    if (Math.max(height, width) < maxResolution) widthNew = width;
    else if (height > width) widthNew = width * (maxResolution / height);
    else widthNew = maxResolution;

    original.quality(qualityImage);
    original.resize(widthNew, Jimp.AUTO);

    await Helpers.saveImgJimp({relPath: resizedRelPath, file: original});
  }

  static async generatePDF({ relPath, fileName, url = 'certificate' }:
    { relPath: string, fileName: string, url: string }) {

    const options = {
      type: 'pdf',
      format: 'A4',
      orientation: 'portrait',
    }

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
    await new Promise(async (resolve, reject) => {
      html_to_pdf.generatePdf({ url }, options).then(async (buffer: Buffer) => {
        try {
          if (AwsS3.isActive()) {
            await new AwsS3({key: `${relPath}/${fileName}.pdf`}).upload({buffer});
            resolve('');
          } else {
            fs.writeFile(`${Helpers.storageRoot(relPath)}/${fileName}.pdf`, buffer, "binary", (errFs: any) => {
              if (errFs) {
                new Log({route: 'write pdf file local'}).setError(errFs).setSideData({ place: 'writeFile' }).setResponse({ status: 16 }).save();
                reject('Error writing file');
              } else resolve('');
            });
          }
        } catch (error: any) {
          new Log({route: 'catch in pdf write'}).setError(error).setSideData({ place: 'catch writeFile' }).setResponse({ status: 17 }).save()
          reject('Error generating PDF');
        }
      });
    });
  }
}
