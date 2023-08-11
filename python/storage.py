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
    # if ('imgIndex' not in params):
    #     params['imgIndex'] = '0'
    # params['imgPath'] = 'storage/img' + params['imgIndex'] + '.jpg'
    # open(file='storage/img' +
    #      params['imgIndex'] + '.jpg', mode="wb").write(buffer)

    nparr = np.frombuffer(buffer, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def uploadCv2(params, blob_name, img, quality=100):
    _, img_encode = cv2.imencode(
        '.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    resized_img_bytes = img_encode.tobytes()
    getContainer(params).upload_blob(
        blob_name, resized_img_bytes, blob_type='BlockBlob', overwrite=True)
