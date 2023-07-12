import numpy as np
import pytesseract
import easyocr
import cv2


def decodeImg(img, params):
    # img1 = np.array(img)
    # text = pytesseract.image_to_string(img1, config='--psm 4')
    text = pytesseract.image_to_string(params['imgPath'], config='--psm 4')

    return [text]


def decodeImgEasyocr(img, params):
    reader = easyocr.Reader(['en'])
    text = ''

    if ('size' in params):
        size = min([int(params['size']), 1800])
        maxDim = max([img.shape[0], img.shape[1]])
        coef = min([1, size / maxDim])
        if (coef < 1):
            img = cv2.resize(
                img, (int(img.shape[1] * coef), int(img.shape[0] * coef)), cv2.INTER_LINEAR)

    result = reader.readtext(img, batch_size=1)

    for row in result:
        text = text + ' ' + row[1]

    return [text]
