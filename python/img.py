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
    gray_image = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    params['laplacian'] = cv2.Laplacian(gray_image, cv2.CV_64F).var()
    if (('hasQrcode' in params and params['hasQrcode'] == 'true') or ('hasBarcode' in params and params['hasBarcode'] == 'true')):
        barqrcodes = barqrcode.decodeImg(img, params)
    else:
        barqrcodes = []

    if 'maxResolution' in params:
        img = resizeCore(img, params)

    facts = []
    if (('hasFact' in params and params['hasFact'] == 'true')):
        if ('engine' not in params or params['engine'] == 'local'):
            if (params['easyocr'] == '1'):
                facts = ocr.decodeImgEasyocr(img, params)
            else:
                facts = ocr.decodeImg(img, params)

    return {'barqrcodes': barqrcodes, 'facts': facts, 'params': params}


def resize(params):
    img = downloadAsCv2(params)
    resizeCore(img, params)
