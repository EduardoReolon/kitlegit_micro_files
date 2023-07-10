import Helpers from "../Helpers";

export default class Watermark {
  static async addWatermark({relPath, watermarkRelPath, check_status, product_id,
    relPathTo, sizeQRCode = 128, padding = 30, brandTeamYear, dateUser}: {
    relPath: string,
    watermarkRelPath: string,
    check_status?: string,
    product_id?: number,
    relPathTo?: string,
    sizeQRCode?: number,
    padding?: number,
    brandTeamYear?: string,
    dateUser?: string,
  }) {
    try {
      const main = await Helpers.readImgSharp({relPath});
      const metaMain = await main.metadata();
      const {data: qrCode, info} = await (await Helpers.readImgSharp({relPath: watermarkRelPath}))
        .resize(sizeQRCode)
        // .composite([
        //   {
        //     // transparency
        //     input: Buffer.from([0,0,0,200]),
        //     raw: {
        //       width: 1,
        //       height: 1,
        //       channels: 4,
        //     },
        //     tile: true,
        //     blend: 'dest-in',
        //   }
        // ])
        .toBuffer({resolveWithObject: true});

      if (typeof qrCode ===  'boolean') throw new Error('Qrcode error');
      const fontSize = Math.floor((20 / 128) * sizeQRCode);
      let svgStr: string
      let paddingYQRCode = 0;
      const compositeExtras: {input: Buffer, left: number, top: number}[] = [];
      if (!brandTeamYear) svgStr = `<svg width="${sizeQRCode}" height="${Math.floor(sizeQRCode + (fontSize * 2.5))}" xmlns:xlink="http://www.w3.org/1999/xlink">
          <text x="50%" y="${fontSize}px" fill="white" dominant-baseline="hanging" text-anchor="middle">${check_status}</text>
          <text x="50%" y="100%" fill="white" dominant-baseline="auto" text-anchor="middle">${product_id?.toString().padStart(6, '0')}</text>
          <style>
            <![CDATA[text {font: bold ${fontSize}px Verdana, Helvetica, Arial, sans-serif;}]]>
          </style>
        </svg>`;
      else {
        paddingYQRCode = 100;
        svgStr = `<svg width="800" height="350" xmlns="http://www.w3.org/2000/svg">
            <text x="240px" y="60px" fill="white" dominant-baseline="hanging" text-anchor="left" style="font-weight: 800;">Certified</text>
            <text x="240px" y="140px" fill="#dfff70" dominant-baseline="hanging" text-anchor="left" style="font-weight: 800;">Authentic</text>
            <text x="0" y="215px" fill="white" style="font-size:20px;" dominant-baseline="auto" text-anchor="left">${brandTeamYear}</text>
            <text x="0" y="245px" fill="white" style="font-size:20px;" dominant-baseline="auto" text-anchor="left">${dateUser}</text>
            <text x="0" y="275px" fill="white" style="font-size:20px;" dominant-baseline="auto" text-anchor="left">ID: ${product_id?.toString().padStart(6, '0')}</text>
            <style>
              <![CDATA[text {font: 80px bold Verdana, Helvetica, Arial, sans-serif;}]]>
            </style>
          </svg>`;

        const bufferBack = Buffer.from(`<svg width="85" height="70" xmlns="http://www.w3.org/2000/svg">
          <defs>
          <style type="text/css"><![CDATA[.fil0 {fill:#DDFD71}]]></style>
          </defs>
          <g id="Camada_x0020_1">
            <metadata id="CorelCorpID_0Corel-Layer"/>
            <path class="fil0" d="M29.23 72.61l53.2 0c-9.78,-43.39 -38.64,-66.1 -82.43,-72.61l0 50.06c14.39,3.41 24,11.04 29.23,22.55z"/>
          </g>
        </svg>`)
      const backResized = await Helpers.sharpFromBuffer(await Helpers.sharpFromBuffer(bufferBack)
        .resize((metaMain.width || 2048) * 0.9).toBuffer());
      const {data: sharpBack, info: infoBack} = await backResized
        .composite([
          {
            // transparency
            input: Buffer.from([0,0,0,30]),
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
        compositeExtras.push({input: sharpBack, left: 0, top: (metaMain.height || 2048) - infoBack.height});

        const bufferGradient = Buffer.from(`<svg width="${metaMain.width}" height="${metaMain.height}"
            xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="three_opacity_stops" gradientTransform="rotate(90)">
                <stop offset="0%" style="stop-color: #000; stop-opacity: 0.0"/>
                <stop offset="60%" style="stop-color: #000; stop-opacity: 0.3"/>
                <stop offset="100%" style="stop-color: #000; stop-opacity: 0.90"/>
              </linearGradient>
            </defs>

            <rect width="${metaMain.width}" height="${metaMain.height}"
              style="fill: url(#three_opacity_stops);"/>
          </svg>`);
        const {data: sharpGradient} = await Helpers.sharpFromBuffer(bufferGradient)
          .toBuffer({resolveWithObject: true});
        compositeExtras.push({input: sharpGradient, left: 0, top: 0});

        const bufferKitLog = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="200px" height="80px" version="1.1" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd"
          viewBox="0 0 37.64 9.89"
          xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
            <style type="text/css">
            <![CDATA[
              .fil0 {fill:#FEFEFE}
              .fil1 {fill:#DDFD71}
              .fil2 {fill:#DDFD71}
            ]]>
            </style>
          </defs>
          <g id="Camada_x0020_1">
            <metadata id="CorelCorpID_0Corel-Layer"/>
            <g id="_1945743881072">
            <path class="fil0" d="M0 3.28l4.31 1.66c1.42,-1.47 1.95,-3.14 1.94,-4.94l-3.3 0c-0.02,1.93 -0.98,3.04 -2.95,3.28z"/>
            <path class="fil1" d="M0 6.6c2.03,0.13 2.97,1.28 2.98,3.29l3.27 0c-0.24,-4.32 -2.5,-6.32 -6.25,-6.61l0 3.32z"/>
            </g>
            <g id="_1945746506464">
            <polygon class="fil2" points="16.32,2.6 14.38,4.51 15.6,6.79 13.85,6.79 13.25,5.62 12.98,5.88 12.84,6.79 11.36,6.79 12.03,2.6 13.5,2.6 13.24,4.21 14.79,2.6 16.32,2.6 "/>
            <polygon class="fil0" points="22.75,5.63 23.84,5.63 23.66,6.79 21.09,6.79 21.75,2.59 23.23,2.59 22.75,5.63 "/>
            <path class="fil0" d="M27.49 3.76l-1.56 0 -0.06 0.38 1.23 0 -0.15 0.95 -1.23 0 -0.09 0.54 1.56 0 -0.18 1.16 -3.03 0 0.67 -4.2 3.02 0c0,0.01 -0.18,1.17 -0.18,1.17z"/>
            <path class="fil0" d="M30.1 4.26l2.04 0c-0.06,0.38 -0.16,0.72 -0.29,1.02 -0.13,0.29 -0.27,0.54 -0.44,0.72 -0.17,0.19 -0.36,0.34 -0.57,0.47 -0.22,0.12 -0.43,0.2 -0.65,0.25 -0.22,0.05 -0.45,0.08 -0.7,0.08 -0.27,0 -0.52,-0.04 -0.75,-0.12 -0.24,-0.08 -0.44,-0.19 -0.63,-0.33 -0.18,-0.14 -0.32,-0.33 -0.43,-0.56 -0.11,-0.23 -0.16,-0.49 -0.16,-0.77 0,-0.37 0.07,-0.72 0.21,-1.04 0.14,-0.32 0.33,-0.6 0.57,-0.82 0.24,-0.23 0.52,-0.4 0.85,-0.53 0.33,-0.13 0.67,-0.2 1.04,-0.2 0.38,0 0.72,0.08 1.03,0.23 0.31,0.15 0.55,0.37 0.71,0.65l-1.28 0.81c-0.02,-0.17 -0.09,-0.29 -0.2,-0.36 -0.11,-0.07 -0.27,-0.1 -0.46,-0.1 -0.16,0 -0.31,0.03 -0.43,0.1 -0.12,0.07 -0.22,0.16 -0.29,0.28 -0.07,0.11 -0.12,0.25 -0.16,0.39 -0.03,0.15 -0.05,0.31 -0.05,0.48 0,0.44 0.21,0.66 0.63,0.66 0.34,0 0.59,-0.14 0.75,-0.41l-0.87 0 0.53 -0.9 0 0z"/>
            <polygon class="fil0" points="32.07,6.71 32.46,4.26 33.94,4.26 33.55,6.71 "/>
            <polygon class="fil0" points="37.64,2.51 37.46,3.67 36.65,3.67 36.17,6.71 34.7,6.71 35.18,3.67 32.55,3.67 32.74,2.51 37.64,2.51 "/>
            <polygon class="fil2" points="15.86,6.79 16.25,4.34 17.72,4.34 17.34,6.79 "/>
            <polygon class="fil2" points="21.43,2.6 21.24,3.76 20.43,3.76 19.95,6.8 18.49,6.8 18.97,3.76 16.34,3.76 16.52,2.6 21.43,2.6 "/>
            </g>
          </g>
          </svg>`);
        const {data: sharpKitLogo, info: infoKitLogo} = await Helpers.sharpFromBuffer(bufferKitLog)
          .toBuffer({resolveWithObject: true});
        compositeExtras.push({input: sharpKitLogo, left: (metaMain.width || 2048) - infoKitLogo.width - padding, top: (metaMain.height || 2048) - infoKitLogo.height - padding});
      }
      const textSVG = Buffer.from(svgStr);
      const {data: textSharp, info: infoText} = await Helpers.sharpFromBuffer(textSVG)
        // .composite([
        //   {
        //     // transparency
        //     input: Buffer.from([0,0,0,200]),
        //     raw: {
        //       width: 1,
        //       height: 1,
        //       channels: 4,
        //     },
        //     tile: true,
        //     blend: 'dest-in',
        //   }
        // ])
        .toBuffer({resolveWithObject: true});
      const watermarkY = (metaMain.height || 1000) - (info.height / 2) - padding;
      main.composite([
        ...compositeExtras,
        {input: qrCode, left: padding, top: Math.floor(watermarkY - paddingYQRCode - (info.height / 2))},
        {input: textSharp, left: padding, top: Math.floor(watermarkY - (infoText.height / 2))}
      ])

      await Helpers.saveImgSharp({relPath: relPathTo || relPath, file: main});
    } catch (err) {
      throw err;
    }
  }
}
