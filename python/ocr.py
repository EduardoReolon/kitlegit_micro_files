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

    if ('coefWidth' in params or 'coefHight' in params):
        if ('coefWidth' not in params):
            params['coefWidth'] = '0'
        if ('coefHight' not in params):
            params['coefHight'] = '0'

        coefWidth = min([1, float(params['coefWidth'])])
        widthStart = math.floor(img.shape[1] * coefWidth / 2)
        widthEnd = math.floor(img.shape[1] * (1 - (coefWidth / 2)))

        coefHight = min([1, float(params['coefHight'])])
        hightStart = math.floor(img.shape[0] * coefHight / 2)
        hightEnd = math.floor(img.shape[0] * (1 - (coefHight / 2)))

        img = img[hightStart:hightEnd, widthStart:widthEnd]

    if ('size' not in params):
        params['size'] = 100000
    size = min([int(params['size']), 1800])
    maxDim = max([img.shape[0], img.shape[1]])
    coef = min([1, size / maxDim])
    if (coef < 1):
        img = cv2.resize(
            img, (0, 0), fx=coef, fy=coef, interpolation=cv2.INTER_AREA)

    facts = []
    angles = [0]
    if ('anglesCount' in params):
        anglesCount = int(params['anglesCount'])
        if (anglesCount >= 2):
            angles.append(90)
        if (anglesCount >= 3):
            angles.append(-90)
        if (anglesCount >= 4):
            angles.append(180)

    for angle in angles:
        if (angle == 0):
            result = reader.readtext(img, batch_size=1)
        elif (angle == 90):
            result = reader.readtext(cv2.rotate(
                img, cv2.ROTATE_90_CLOCKWISE), batch_size=1)
        elif (angle == -90):
            result = reader.readtext(cv2.rotate(
                img, cv2.ROTATE_90_COUNTERCLOCKWISE), batch_size=1)
        elif (angle == 180):
            result = reader.readtext(cv2.rotate(
                img, cv2.ROTATE_180), batch_size=1)

        text = ''
        for row in result:
            text = text + ' ' + row[1]
        facts.append(text)

    return facts
