from azure.storage.blob import BlobServiceClient
import numpy as np
import cv2
import os


def downloadAsCv2(params):
    blob_service_client = BlobServiceClient.from_connection_string(
        'DefaultEndpointsProtocol=https;AccountName={};AccountKey={};EndpointSuffix=core.windows.net'
        .format(params['account'], params['account_key']))
    container_client = blob_service_client.get_container_client(
        container=params['container'])
    buffer = container_client.download_blob(
        params['relPath']).readall()

    isExist = os.path.exists('storage')
    if not isExist:
        os.makedirs('storage')
    if ('imgIndex' not in params):
        params['imgIndex'] = '0'
    params['imgPath'] = 'storage/img' + params['imgIndex'] + '.jpg'
    open(file='storage/img' +
         params['imgIndex'] + '.jpg', mode="wb").write(buffer)

    nparr = np.frombuffer(buffer, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
