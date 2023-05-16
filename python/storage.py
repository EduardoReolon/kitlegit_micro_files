from azure.storage.blob import BlobServiceClient
import numpy as np
import cv2


def downloadAsCv2(params):
    blob_service_client = BlobServiceClient.from_connection_string(
        'DefaultEndpointsProtocol=https;AccountName={};AccountKey={};EndpointSuffix=core.windows.net'
        .format(params['account'], params['account_key']))
    container_client = blob_service_client.get_container_client(
        container=params['container'])
    buffer = container_client.download_blob(
        params['relPath']).readall()
    nparr = np.frombuffer(buffer, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
