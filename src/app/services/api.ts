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
        },
        azureOCR: {
            url: string
            subscriptionKey: string
            language: 'en'|'ja'
            path: '/vision/v3.1/ocr'
        }
    }

    static async ocrSpace(formData: FormData, getJapaneseChars?: boolean) {
        const facts: string[] = [];
    
        await new Promise((resolve) => {
            // https://ocr.space/ocrapi
            if (getJapaneseChars) {
                formData.append('OCREngine', 1);
                formData.append('language', 'jpn');
            } else formData.append('OCREngine', 2);

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
                        let result;
                        try {
                            result = JSON.parse(d) as {
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
                        } catch (error) {
                            new Log({route: 'services/api parsing body'}).setSideData({body: d}).save();
                            throw error;
                        }
    
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

    static async azureOCR(formData: FormData) {
        const facts: string[] = [];
    
        await new Promise((resolve) => {
            // https://ocr.space/ocrapi
            formData.append('OCREngine', 2);
    
            var options = {
                protocol: 'https:',
                hostname: Api.settings.azureOCR.url,
                port: 443,
                path: Api.settings.azureOCR.path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': Api.settings.azureOCR.subscriptionKey,
                    ...formData.getHeaders()
                }
            };
    
            var req = https.request(options, (res) => {
                try {
                    res.on('data', (d) => {
                        const result = JSON.parse(d) as {
                            language: "en",
                            textAngle: 0.0,
                            orientation: "Up",
                            regions: {
                                boundingBox: "680,568,495,783",
                                lines: {
                                    boundingBox: "714,568,416,61",
                                    words: {
                                        boundingBox: "714,600,54,29",
                                        text: "DIE"
                                    }[]
                                }[]
                            }[]
                        };
    
                        if (!res.statusCode || res.statusCode < 205) {
                            facts.push(result.regions.map((region) => {
                                return region.lines.map((line) => {
                                    return line.words.map((word) => word.text).join(' ');
                                }).join('\n');
                            }).join('\n'));
                        }
    
                        new Log({route: 'Returning from OCR space'}).setResponse({response: JSON.stringify(result)}).save();
                    });
    
                    resolve('');
                } catch (error) {
                    new Log({route: 'Try catch return from azure OCR'}).setError(error as Error).save();
                    resolve('');
                }
            });
    
            req.on('error', (e) => {
                new Log({route: 'azure OCR error request'}).setError(e).save();
                resolve('');
            });
    
            formData.pipe(req, {end: true});
        });
    
        return facts;
    }

    static async factFromAPI({ engine, absPath, getJapaneseChars }: { engine: enginesTypes, absPath: string, getJapaneseChars?: boolean }): Promise<{facts: string[], factsJa: string[]}> {
        let facts: string[] = [];
        let factsJa: string[] = [];

        const formData = new FormData();
        formData.append('file', fs.createReadStream(absPath), {contentType: 'image/jpg'});
        
        if (engine === 'ocrspace') facts = await Api.ocrSpace(formData);
        if (engine === 'azure') facts = await Api.azureOCR(formData);
        
        if (getJapaneseChars) {
            const formDataJa = new FormData();
            formDataJa.append('file', fs.createReadStream(absPath), {contentType: 'image/jpg'});
            factsJa = await Api.ocrSpace(formDataJa, getJapaneseChars);
        }

        return {facts, factsJa};
    }
}