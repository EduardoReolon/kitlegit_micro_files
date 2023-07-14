import numpy as np
import pytesseract
import easyocr
import cv2
import math


def decodeImg(img, params):
    # img1 = np.array(img)
    # text = pytesseract.image_to_string(img1, config='--psm 4')
    text = pytesseract.image_to_string(params['imgPath'], config='--psm 4')

    return [text]


def decodeImgEasyocr(img, params):
    reader = easyocr.Reader(['en'])
    text = ''

    img = cv2.imread(params['imgPath'])

    if ('size' not in params):
        params['size'] = 100000
    size = min([int(params['size']), 1800])
    maxDim = max([img.shape[0], img.shape[1]])
    coef = min([1, size / maxDim])
    if (coef < 1):
        img = cv2.resize(
            img, (int(img.shape[1] * coef), int(img.shape[0] * coef)))

    if ('coefWidth' in params):
        coefWidth = min([1, float(params['coefWidth'])])
        widthStart = math.floor(img.shape[1] * coefWidth / 2)
        widthEnd = math.floor(img.shape[1] * (1 - (coefWidth / 2)))
        img = img[0:img.shape[0], widthStart:widthEnd]

    result = reader.readtext(img, batch_size=1)

    for row in result:
        text = text + ' ' + row[1]

    return [text]
