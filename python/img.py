from storage import downloadAsCv2
import barqrcode
import ocr


def dataExtraction(params):
    img = downloadAsCv2(params)
    barqrcodes = barqrcode.decodeImg(img)

    facts = ocr.decodeImg(img)

    return {'barqrcodes': barqrcodes, 'facts': facts}
