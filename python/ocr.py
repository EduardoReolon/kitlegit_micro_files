import numpy as np
import pytesseract


def decodeImg(img):
    img1 = np.array(img)
    text = pytesseract.image_to_string(img1)

    return [text]
