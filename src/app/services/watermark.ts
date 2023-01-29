import Helpers from "../Helpers";

const Jimp = require('jimp');

const defaultOptions = {
  ratio: 0.6,
  opacity: 0.6,
  dstPath: Helpers.storageRoot('watermark.jpg'),
  text: 'jimp-watermark',
  textSize: 1,
}

const SizeEnum: any = Object.freeze({
  1: Jimp.FONT_SANS_8_BLACK,
  2: Jimp.FONT_SANS_10_BLACK,
  3: Jimp.FONT_SANS_12_BLACK,
  4: Jimp.FONT_SANS_14_BLACK,
  5: Jimp.FONT_SANS_16_BLACK,
  6: Jimp.FONT_SANS_32_BLACK,
  7: Jimp.FONT_SANS_64_BLACK,
  8: Jimp.FONT_SANS_128_BLACK,
});
const ErrorTextSize = new Error("Text size must range from 1 - 8");
const ErrorScaleRatio = new Error("Scale Ratio must be less than one!");
const ErrorOpacity = new Error("Opacity must be less than one!");

const getDimensions = (H: number, W: number, h: number, w: number, ratio: number) => {
  let hh, ww;
  if ((H / W) < (h / w)) {    //GREATER HEIGHT
    hh = ratio * H;
    ww = hh / h * w;
  } else {                //GREATER WIDTH
    ww = ratio * W;
    hh = ww / w * h;
  }
  return [hh, ww];
}

const checkOptions = (options: any) => {
  options = { ...defaultOptions, ...options };
  if (options.ratio > 1) {
    throw ErrorScaleRatio;
  }
  if (options.opacity > 1) {
    throw ErrorOpacity;
  }
  return options;
}

export default class Watermark {
  static async addText(main: typeof Jimp, options: any) {
    options = checkOptions(options);
    const maxHeight = main.getHeight();
    const maxWidth = main.getWidth();
    if (Object.keys(SizeEnum).includes(String(options.textSize))) {
      const font = await Jimp.loadFont(SizeEnum[options.textSize]);
      const positionX = options.centerX
        ? 0
        : (main.getWidth() / 2) + (options.spanX || 0);
      const positionY = options.centerY
        ? 0
        : (main.getHeight() / 2) + (options.spanY || 0);
      await main.print(font, positionX, positionY, {
        text: options.text,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      }, maxWidth, maxHeight);
    } else {
      throw ErrorTextSize;
    }
  }

  /**
   * @param {String} mainImage - Path of the image to be watermarked
   * @param {Object} options
   * @param {String} options.text     - String to be watermarked
   * @param {Number} options.textSize - Text size ranging from 1 to 8
   * @param {String} options.dstPath  - Destination path where image is to be exported
   */
  static async addTextWatermark(relPath: string, options: any) {
    try {
      const main = await Helpers.readImgJimp({relPath});
      await Watermark.addText(main, options);
      main.quality(97);

      await Helpers.saveImgJimp({relPath, file: main});
    } catch (err) {
      throw err;
    }
  }

  /**
   * @param {String} mainImage - Path of the image to be watermarked
   * @param {String} watermarkImage - Path of the watermark image to be applied
   * @param {Object} options
   * @param {Float} options.ratio     - Ratio in which the watermark is overlaid
   * @param {Float} options.opacity   - Value of opacity of the watermark image during overlay
   * @param {String} options.dstPath  - Destination path where image is to be exported
   */
  static async addWatermark(relPath: string, watermarkRelPath: string, options: any, optionsText?: any) {
    try {
      options = checkOptions(options);
      const main = await Helpers.readImgJimp({relPath});
      Helpers.imgCrop({img: main});
      const watermark = await Helpers.readImgJimp({relPath: watermarkRelPath});
      const [newHeight, newWidth] = getDimensions(watermark.getHeight(), watermark.getWidth(), watermark.getHeight(), watermark.getWidth(), options.ratio);
      watermark.resize(newWidth, newHeight);
      const positionX = options.centerX
        ? (main.getWidth() - newWidth) / 2
        : options.rightLeft
          ? main.getWidth() - watermark.getWidth() - (options.spanX || 15)
          : options.spanX || 15;
      const positionY = options.centerY
        ? (main.getHeight() - newHeight) / 2
        : options.bottomTop
          ? main.getHeight() - watermark.getHeight() - (options.spanY || 15)
          : options.spanY || 15;
      watermark.opacity(options.opacity);
      main.composite(watermark,
        positionX,
        positionY,
        (Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE) as any);

      if (optionsText) await Watermark.addText(main, optionsText);
      main.quality(97);

      await Helpers.saveImgJimp({relPath: options.dstPath, file: main});
    } catch (err) {
      throw err;
    }
  }
}
