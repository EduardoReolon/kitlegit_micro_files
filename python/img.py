from storage import downloadAsCv2, uploadCv2
import barqrcode
import ocr
import cv2
import math


def resizeCore(img, params):
    minDim = min([img.shape[0], img.shape[1]])
    widthPadding = math.floor((img.shape[1] - minDim) / 2)
    hightPadding = math.floor((img.shape[0] - minDim) / 2)
    img = img[hightPadding:(img.shape[0] - hightPadding),
              widthPadding:(img.shape[1] - widthPadding)]

    size = int(params['maxResolution'])
    quality = 50 if (size <= 256) else 90
    maxDim = max([img.shape[0], img.shape[1]])
    coef = min([1, size / maxDim])
    if (coef < 1):
        img = cv2.resize(
            img, (0, 0), fx=coef, fy=coef, interpolation=cv2.INTER_AREA)

    blob_name = params['resizedRelPath'] if 'resizedRelPath' in params else params['relPath']
    uploadCv2(params, blob_name, img, quality)
    return img


def dataExtraction(params):
    img = downloadAsCv2(params)
    if (params['hasQrcode'] == 'true' or params['hasBarcode'] == 'true'):
        barqrcodes = barqrcode.decodeImg(img, params)
    else:
        barqrcodes = []

    if 'maxResolution' in params:
        img = resizeCore(img, params)

    if (params['hasFact'] == 'true'):
        if (params['easyocr'] == '1'):
            facts = ocr.decodeImgEasyocr(img, params)
        else:
            facts = ocr.decodeImg(img, params)
    else:
        facts = []

    return {'barqrcodes': barqrcodes, 'facts': facts}


def resize(params):
    img = downloadAsCv2(params)
    resizeCore(img, params)
