# from pyzbar.pyzbar import decode
# import collections.abc
import subprocess
import os
import json
import cv2
import numpy as np  # has to be version 1.23.5
from PIL import Image
from kraken import binarization  # pip install kraken==2.0.8
from random import randrange


def decodeImg(img, params):
    # detectedBarcodes = decode(img)
    values: list[dict[str, str]] = []

    # if isinstance(detectedBarcodes, collections.abc.Sequence):
    #     for code in detectedBarcodes:
    #         if code.data != '':
    #             values.append({'data': code.data, 'type': code.type})

    imgIndex = randrange(20)
    fileName = 'storage/img' + str(imgIndex) + '.jpg'
    fileNameFull = f'python/{fileName}' if os.path.exists(
        'python') else fileName

    im = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    im = Image.fromarray(im)

    bw_im = binarization.nlbin(im)
    bw_im.save(fileNameFull)

    # with Image.open(fileNameFull) as im:
    #     bw_im = binarization.nlbin(im)
    #     bw_im.save(fileNameFull)

    dir = os.path.dirname(os.path.realpath(__file__))
    os.chdir(dir)

    system = 'Win' if params['os'] == 'win' else 'Linux'
    exe = f'BarcodeReaderCLI{system}/BarcodeReaderCLI'
    isExist = os.path.exists('python')
    if isExist:
        exe = f'python/{exe}'

    args = []
    args.append(exe)
    args.append(
        '-type=pdf417,qr,datamatrix,code39,code128,codabar,ucc128,code93,upca,ean8,upce,ean13,i25,imb,bpo,aust,sing')
    args.append('-tbr=103')
    args.append(fileName)

    cp = subprocess.run(args, universal_newlines=True,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    output = cp.stdout

    if output != "":
        values: list[dict[str, str]] = []
        for session in json.loads(output)['sessions']:
            for barcode in session['barcodes']:
                values.append(
                    {'data': barcode['text'], 'type': barcode['type']})

    return values
