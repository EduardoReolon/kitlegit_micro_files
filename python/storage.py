from azure.storage.blob import BlobServiceClient
import numpy as np
import cv2
import os


def getContainer(params):
    blob_service_client = BlobServiceClient.from_connection_string(
        'DefaultEndpointsProtocol=https;AccountName={};AccountKey={};EndpointSuffix=core.windows.net'
        .format(params['account'], params['account_key']))
    return blob_service_client.get_container_client(
        container=params['container'])


def downloadAsCv2(params):
    container_client = getContainer(params)
    buffer = container_client.download_blob(
        params['relPath']).readall()

    storageFolder = 'python/storage' if os.path.exists('python') else 'storage'
    isExist = os.path.exists(storageFolder)
    if not isExist:
        os.makedirs(storageFolder)

    # write the file in disk, to be used for node
    # python is better in resizing
    if ('imgIndex' not in params):
        params['imgIndex'] = '0'
    params['imgPath'] = 'storage/img' + params['imgIndex'] + '.jpg'
    open(params['imgPath'], mode="wb").write(buffer)
    # resizing
    if ('maxSizeKb' in params):
        maxSizeKb = int(params['maxSizeKb']) * 1000
    else: maxSizeKb = 20000000 # 20Mb

    if ('maxSizePx' in params):
        img = cv2.imread(params['imgPath'])
        maxDim = max([img.shape[0], img.shape[1]])
        coef = min([1, int(params['maxSizePx']) / maxDim])
        if (coef < 1):
            img = cv2.resize(
                img, (0, 0), fx=coef, fy=coef, interpolation=cv2.INTER_AREA)
        cv2.imwrite(params['imgPath'], img)

    fileSize = os.path.getsize(params['imgPath'])
    params['rootFolder'] = os.getcwd()
    while (fileSize > maxSizeKb):
        img = cv2.imread(params['imgPath'])
        img = cv2.resize(
            img, (0, 0), fx=0.95, fy=0.95, interpolation=cv2.INTER_AREA)
        cv2.imwrite(params['imgPath'], img)
        # print(maxSizeKb, fileSize, params['imgPath'])
        fileSize = os.path.getsize(params['imgPath'])

    nparr = np.frombuffer(buffer, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def uploadCv2(params, blob_name, img, quality=100):
    _, img_encode = cv2.imencode(
        '.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    resized_img_bytes = img_encode.tobytes()
    getContainer(params).upload_blob(
        blob_name, resized_img_bytes, blob_type='BlockBlob', overwrite=True)
