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
      const fontSize = (18 / 128) * sizeQRCode;
      const textSVG = Buffer.from(`<svg width="${sizeQRCode}" height="${sizeQRCode + 52}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="8%" font-size="${fontSize}" fill="white" dominant-baseline="middle" text-anchor="middle">${check_status}</text>
        <text x="50%" y="92%" font-size="${fontSize}" fill="white" dominant-baseline="middle" text-anchor="middle">${product_id}</text>
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
        {input: qrCode, left: padding, top: watermarkY - (info.height / 2)},
        {input: textSharp, left: padding, top: watermarkY - (infoText.height / 2) + 5}
      ])

      await Helpers.saveImgSharp({relPath: relPathTo || relPath, file: main});
    } catch (err) {
      throw err;
    }
  }
}
