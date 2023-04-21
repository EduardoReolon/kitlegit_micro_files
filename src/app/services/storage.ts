import {
  S3Client,
  PutObjectCommand, GetObjectCommand, CopyObjectCommand,
  HeadObjectCommand, HeadObjectCommandInput, HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { env } from '../../kernel/env';
import { awsS3StorageClasses } from '../interfaces';
import { ContainerClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import Logs from './log';
const fs = require('fs');

type storagesAvailable = 'aws' | 'azure';

let settings: {
  storage_server: storagesAvailable | '',
  aws: {
    bucketName: string,
    region: string,
    credentials?: {
      accessKeyId: any,
      secretAccessKey: any,
    }
  },
  azure: {
    account: string,
    account_key: string,
    container: string,
  }
} = {
  storage_server: (env.storage_server as storagesAvailable) || '',
  aws: {
    bucketName: env.aws_s3_bucket || '',
    region: env.aws_s3_region || '',
    credentials: {
      accessKeyId: env.aws_s3_access_key_id,
      secretAccessKey: env.aws_s3_secret_access_key,
    }
  },
  azure: {
    account: env.azure_account || '',
    account_key: env.azure_account_key || '',
    container: env.azure_container || '',
  }
};

export default class Storage {
  key: string; // folder/file || file
  sharedKeyCredential: StorageSharedKeyCredential | undefined;
  containerAzure: ContainerClient | undefined;

  constructor({key}: {key: string}) {
    this.key = key;
    if (settings.storage_server === 'azure') {
      this.sharedKeyCredential = new StorageSharedKeyCredential(settings.azure.account, settings.azure.account_key);
      this.containerAzure = new ContainerClient(
        `https://${settings.azure.account}.blob.core.windows.net/${settings.azure.container}`,
        this.sharedKeyCredential,
      );
    }
  }

  static isActive() {
    return !!settings.storage_server;
  }

  static setSettings(settingsNew: typeof settings) {
    settings = settingsNew;
  }

  async streamToBuffer(stream: NodeJS.ReadableStream | undefined): Promise<Buffer> {
    if (!stream) throw new Error('Stream error');

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (data) => {
        chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
      });
      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      stream.on("error", reject);
    });
  }

  getClientAws() {
    return new S3Client({
      region: settings.aws.region,
      credentials: {
        accessKeyId: settings.aws.credentials?.accessKeyId,
        secretAccessKey: settings.aws.credentials?.secretAccessKey,
      },
    });
  }

  getBucketNameAws(): string {
    return settings.aws.bucketName;
  }

  getBlockBlobAzure() {
    return this.containerAzure!.getBlockBlobClient(this.key);
  }

  newLog(funcName: string) {
    return new Logs({ route: `AwsS3 - ${funcName}` });
  }

  async copy({keyTo}: {keyTo: string}) {
    try {
      if (settings.storage_server === 'aws') {
        const response = await this.getClientAws().send(new CopyObjectCommand({
          Bucket: this.getBucketNameAws(),
          Key: keyTo,
          CopySource: `${this.getBucketNameAws()}/${this.key}`,
        }))

        if (response.$metadata.httpStatusCode === 200) return true;
        this.newLog('copy').setResponse({status: response.$metadata?.httpStatusCode || 45}).save();
      } else {
        const poller = await this.containerAzure!.getBlockBlobClient(keyTo).beginCopyFromURL(this.getBlockBlobAzure().url);
        const response = await poller.pollUntilDone();
        if (response.copyStatus === 'success') return true;
        this.newLog('copy').setResponse({response: response.errorCode}).save();
      }
    } catch (error) {
      this.newLog('copy').setError(error as Error).setResponse({status: 47}).save();
    }

    return false;
  }

  async download({type = 'buffer'}: {type?: 'body' | 'buffer'} = {}) {
    try {
      if (settings.storage_server === 'aws') {
        const response = await this.getClientAws().send(new GetObjectCommand({
          Bucket: this.getBucketNameAws(),
          Key: this.key,
        }))

        if (response.$metadata.httpStatusCode === 200) {
          if (type === 'buffer') return await this.streamToBuffer(response.Body as NodeJS.ReadableStream | undefined);
          return response.Body;
        }
        this.newLog('download').setResponse({status: response.$metadata?.httpStatusCode || 45})
          .setSideData({key: this.key}).save();
      } else {
        const blockBlobClient = this.getBlockBlobAzure();
        const snapshotResponse = await blockBlobClient.createSnapshot();
        const blobSnapshotClient = blockBlobClient.withSnapshot(snapshotResponse.snapshot!);
        const response = await blobSnapshotClient.download(0);
        if (type === 'buffer') return await this.streamToBuffer(response.readableStreamBody!);
        this.newLog('download').setResponse({response: response.errorCode})
          .setSideData({key: this.key}).save();
      }
    } catch (error) {
      this.newLog('download').setError(error as Error).setSideData({key: this.key}).setResponse({status: 47}).save();
    }

    return false;
  }

  async upload({filePath, storageClass = 'STANDARD', buffer}: {
    filePath?: string,
    storageClass?: awsS3StorageClasses,
    buffer?: Buffer,
  }) {
    try {
      const file = buffer || fs.readFileSync(filePath);
      if (settings.storage_server === 'aws') {
        /**
         * Storage classes:
         * DEEP_ARCHIVE
         * GLACIER
         * GLACIER_IR
         * INTELLIGENT_TIERING
         * ONEZONE_IA
         * OUTPOSTS
         * REDUCED_REDUNDANCY
         * STANDARD
         * STANDARD_IA
         */
        const response = await this.getClientAws().send(new PutObjectCommand({
          Bucket: this.getBucketNameAws(),
          Key: this.key,
          StorageClass: storageClass,
          Body: file,
        }));

        if (response.$metadata.httpStatusCode === 200) return;

        this.newLog('upload').setResponse({status: response.$metadata?.httpStatusCode || 45})
          .setSideData({key: this.key}).save();
      } else {
        const response = await this.getBlockBlobAzure()
          .upload(file, Buffer.byteLength(file));
        if (response.requestId) return;
        this.newLog('upload').setResponse({response: response.errorCode})
          .setSideData({key: this.key}).save();
      }
    } catch (error) {
      this.newLog('upload').setError(error as Error).setSideData({key: this.key}).setResponse({status: 46}).save();
    }

    throw 'Error storing file';
  }

  async exists(): Promise<boolean> {
    try {
      if (settings.storage_server === 'aws') {
        const bucketParams: HeadObjectCommandInput = {
          Bucket: this.getBucketNameAws(),
          Key: this.key,
        };
        const cmd = new HeadObjectCommand(bucketParams);
        const response: HeadObjectCommandOutput = await this.getClientAws().send(cmd);

        return response.$metadata.httpStatusCode === 200;
      } else return await this.getBlockBlobAzure().exists();
    } catch (error) {
      if (settings.storage_server === 'aws') {
        if ((error as any).$metadata?.httpStatusCode === 404) {
          // doesn't exist and permission policy includes s3:ListBucket
        } else if ((error as any).$metadata?.httpStatusCode === 403) {
          // doesn't exist, permission policy WITHOUT s3:ListBucket
        } else {
          // some other error
          // ...log and rethrow if you like
        }
      }
    }
    return false;
  }
}
