import Helpers from "../Helpers";

export default class Watermark {
  static async addWatermark(relPath: string, watermarkRelPath: string, certificateCode: string) {
    try {
      const main = await Helpers.readImgSharp({relPath});
      const metaMain = await main.metadata();
      const {data: qrCode, info} = await (await Helpers.readImgSharp({relPath: watermarkRelPath})).toBuffer({resolveWithObject: true});

      if (typeof qrCode ===  'boolean') throw new Error('Qrcode error');
      const textedSVG = Buffer.from(`<svg>
        <rect x="0" y="0" width="500" height="100" fill="#0000" />
        <text x="10" y="76" font-size="50" fill="black">${certificateCode}</text>
      </svg>`);
      main.composite([
        {input: qrCode, left: 15, top: (metaMain.height || 1000) - info.height - 15},
        {input: textedSVG, left: (metaMain.width || 1000) - 1000, top: (metaMain.height || 1000) - (info.height / 2) - 15}
      ])

      await Helpers.saveImgSharp({relPath, file: main});
    } catch (err) {
      throw err;
    }
  }
}
