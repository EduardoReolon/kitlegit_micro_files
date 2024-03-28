import { enginesTypes } from "../interfaces";
import https from 'https';
import FormData, { promises } from 'form-data';
import fs from 'fs';
import Log from "./log";

export default class Api {
    public static settings: {
        ocrspace: {
            key: string
            url: string
        }
    }

    static async factFromAPI({ engine, absPath }: { engine: enginesTypes, absPath: string }): Promise<string[]> {
        const facts: string[] = [];

        await new Promise((resolve) => {
            // https://ocr.space/ocrapi
            const formData = new FormData();
            formData.append('file', fs.createReadStream(absPath), {
                contentType: 'image/jpg'
            });
            formData.append('OCREngine', 2);
    
            var options = {
                protocol: 'https:',
                hostname: Api.settings.ocrspace.url,
                port: 443,
                path: '/parse/image',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': Api.settings.ocrspace.key,
                    ...formData.getHeaders()
                }
            };
    
            var req = https.request(options, (res) => {
                try {
                    res.on('data', (d) => {
                        const result = JSON.parse(d) as {
                            ParsedResults: {
                                TextOverlay: {
                                    Lines: any[],
                                    HasOverlay: boolean,
                                    Message: "Text overlay is not provided as it is not requested"
                                },
                                TextOrientation: "0",
                                FileParseExitCode: 1,
                                ParsedText: string,
                                ErrorMessage: string,
                                ErrorDetails: string
                            }[],
                            OCRExitCode: 1 | 3,
                            ErrorMessage: [
                                string
                            ],
                            ErrorDetails: string,
                            IsErroredOnProcessing: boolean,
                            ProcessingTimeInMilliseconds: number, // integer
                            SearchablePDFURL: "Searchable PDF not generated as it was not requested."
                        };
    
                        if (result.OCRExitCode === 1) facts.push(...(result.ParsedResults.map((r) => r.ParsedText)));
    
                        new Log({route: 'Returning from OCR space'}).setResponse({response: JSON.stringify(result)}).save();
                    });
    
                    resolve('');
                } catch (error) {
                    new Log({route: 'Try catch return from OCR space'}).setError(error as Error).save();
                    resolve('');
                }
            });
    
            req.on('error', (e) => {
                new Log({route: 'OCR space error request'}).setError(e).save();
                resolve('');
            });
    
            formData.pipe(req, {end: true});
        });

        return facts;
    }
}