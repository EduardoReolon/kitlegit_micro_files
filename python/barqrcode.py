from pyzbar.pyzbar import decode
import collections.abc


def decodeImg(img):
    detectedBarcodes = decode(img)
    values: list[dict[str, str]] = []

    if isinstance(detectedBarcodes, collections.abc.Sequence):
        for code in detectedBarcodes:
            if code.data != '':
                values.append({'data': code.data, 'type': code.type})

    return values
