from storage import downloadAsCv2
import barqrcode
import ocr


def dataExtraction(params):
    img = downloadAsCv2(params)
    barqrcodes = barqrcode.decodeImg(img)

    if (params['easyocr'] == '1'):
        facts = ocr.decodeImgEasyocr(img, params)
    else:
        facts = ocr.decodeImg(img, params)

    return {'barqrcodes': barqrcodes, 'facts': facts}
