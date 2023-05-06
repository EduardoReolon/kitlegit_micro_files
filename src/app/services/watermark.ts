import Helpers from "../Helpers";

export default class Watermark {
  static async addWatermark({relPath, watermarkRelPath, check_status, product_id,
    relPathTo, sizeQRCode = 128, padding = 30}: {
    relPath: string,
    watermarkRelPath: string,
    check_status?: string,
    product_id?: number,
    relPathTo?: string,
    sizeQRCode?: number,
    padding?: number,
  }) {
    try {
      const main = await Helpers.readImgSharp({relPath});
      const metaMain = await main.metadata();
      const {data: qrCode, info} = await (await Helpers.readImgSharp({relPath: watermarkRelPath}))
        .resize(sizeQRCode)
        .composite([
          {
            // transparency
            input: Buffer.from([0,0,0,200]),
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
      const fontSize = Math.floor((14 / 128) * sizeQRCode);
      const textSVG = Buffer.from(`<svg width="${sizeQRCode}" height="${Math.floor(sizeQRCode + (fontSize * 2.5))}">
        <text x="50%" y="${fontSize}px" fill="white" dominant-baseline="hanging" text-anchor="middle">${check_status}</text>
        <text x="50%" y="100%" fill="white" dominant-baseline="auto" text-anchor="middle">${product_id?.toString().padStart(6, '0')}</text>
        <style>
          <![CDATA[text {font: bold ${fontSize}px Verdana, Helvetica, Arial, sans-serif;}]]>
        </style>
      </svg>`);
      const {data: textSharp, info: infoText} = await Helpers.sharpFromBuffer(textSVG)
        .composite([
          {
            // transparency
            input: Buffer.from([0,0,0,200]),
            raw: {
              width: 1,
              height: 1,
              channels: 4,
            },
            tile: true,
            blend: 'dest-in',
          }
        ]).toBuffer({resolveWithObject: true});
      const watermarkY = (metaMain.height || 1000) - (info.height / 2) - padding;
      main.composite([
        {input: qrCode, left: padding, top: Math.floor(watermarkY - (info.height / 2))},
        {input: textSharp, left: padding, top: Math.floor(watermarkY - (infoText.height / 2))}
      ])

      await Helpers.saveImgSharp({relPath: relPathTo || relPath, file: main});
    } catch (err) {
      throw err;
    }
  }
}
