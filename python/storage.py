from azure.storage.blob import BlobServiceClient
import numpy as np
import cv2


def downloadAsCv2(params: dict[str, str]):
    print(1)
    blob_service_client = BlobServiceClient.from_connection_string(
        'DefaultEndpointsProtocol=https;AccountName={};AccountKey={};EndpointSuffix=core.windows.net'
        .format(params['account'], params['account_key']))
    print(2)
    container_client = blob_service_client.get_container_client(
        container=params['container'])
    print(3)
    nparr = np.frombuffer(container_client.download_blob(
        params['relPath']).readall(), np.uint8)
    print(4)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
