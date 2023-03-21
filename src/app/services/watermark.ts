import Helpers from "../Helpers";

export default class Watermark {
  static async addWatermark(relPath: string, watermarkRelPath: string, certificateCode: string) {
    try {
      const main = await Helpers.readImgSharp({relPath});
      const metaMain = await main.metadata();
      const {data: qrCode, info} = await (await Helpers.readImgSharp({relPath: watermarkRelPath}))
        .resize(128)
        .composite([
          {
            // transparency
            input: Buffer.from([0,0,0,64]),
            raw: {
              width: 1,
              height: 1,
              channels: 4,
            },
            tile: true,
            blend: 'dest-in',
          }
        ])
        .toBuffer({resolveWithObject: true});

      if (typeof qrCode ===  'boolean') throw new Error('Qrcode error');
      const textSVG = Buffer.from(`<svg>
        <rect x="0" y="0" width="500" height="100" fill="#0000" />
        <text x="10" y="76" font-size="25" fill="black">ID: ${certificateCode}</text>
      </svg>`);
      const {data: textSharp, info: infoText} = await Helpers.sharpFromBuffer(textSVG)
        .composite([
          {
            // transparency
            input: Buffer.from([0,0,0,128]),
            raw: {
              width: 1,
              height: 1,
              channels: 4,
            },
            tile: true,
            blend: 'dest-in',
          }
        ]).toBuffer({resolveWithObject: true});
      main.composite([
        {input: qrCode, left: 15, top: (metaMain.height || 1000) - info.height - 15},
        {input: textSharp, left: (metaMain.width || 1000) - infoText.width - 30, top: (metaMain.height || 1000) - (info.height / 2) - (infoText.height / 2) - 15}
      ])

      await Helpers.saveImgSharp({relPath, file: main});
    } catch (err) {
      throw err;
    }
  }
}
