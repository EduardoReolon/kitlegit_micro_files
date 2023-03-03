import {
  S3Client,
  PutObjectCommand, GetObjectCommand, CopyObjectCommand,
  HeadObjectCommand, HeadObjectCommandInput, HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { env } from '../../kernel/env';
import { awsS3StorageClasses } from '../interfaces';
import Logs from './log';
const fs = require('fs');

let settings: {
  bucketName: string;
  region: any;
  credentials?: {
    accessKeyId: any;
    secretAccessKey: any;
  }
} = {
  bucketName: env.aws_s3_bucket || '',
  region: env.aws_s3_region || '',
  credentials: {
    accessKeyId: env.aws_s3_access_key_id,
    secretAccessKey: env.aws_s3_secret_access_key,
  }
};

let active: boolean = !!(env.aws_s3_region && env.aws_s3_bucket);

export default class AwsS3 {
  key: string; // folder/file || file

  constructor({key}: {key: string}) {
    this.key = key;
  }

  static isActive() {
    return !!(settings.region && settings.bucketName);
  }

  static setSettings(settingsNew: {
    bucketName: string;
    region: any;
    credentials: {
      accessKeyId: any;
      secretAccessKey: any;
    },
  }) {
    settings = settingsNew;
  }

  getClient() {
    return new S3Client({
      region: settings.region,
      credentials: {
        accessKeyId: settings.credentials?.accessKeyId,
        secretAccessKey: settings.credentials?.secretAccessKey,
      },
    });
  }

  getBucketName(): string {
    return settings.bucketName;
  }

  newLog(funcName: string) {
    return new Logs({ route: `AwsS3 - ${funcName}` });
  }

  async copy({keyTo}: {keyTo: string}) {
    try {
      const response = await this.getClient().send(new CopyObjectCommand({
        Bucket: this.getBucketName(),
        Key: keyTo,
        CopySource: `${this.getBucketName()}/${this.key}`,
      }))

      if (response.$metadata.httpStatusCode === 200) return true;
      this.newLog('copy').setResponse({status: response.$metadata?.httpStatusCode || 45}).save();
    } catch (error) {
      this.newLog('copy').setError(error as Error).setResponse({status: 47}).save();
    }

    return false;
  }

  async download({type = 'buffer'}: {type?: 'body' | 'buffer'} = {}) {
    async function stream2buffer(stream: any) {
      return new Promise((resolve, reject) => {
        const _buf: any[] = [];
        stream.on("data", (chunk: any) => _buf.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(_buf)));
        stream.on("error", (err: any) => reject(err));
      });
    }

    try {
      const response = await this.getClient().send(new GetObjectCommand({
        Bucket: this.getBucketName(),
        Key: this.key,
      }))

      if (response.$metadata.httpStatusCode === 200) {
        if (type === 'buffer') return await stream2buffer(response.Body);
        return response.Body;
      }
      this.newLog('download').setResponse({status: response.$metadata?.httpStatusCode || 45})
        .setSideData({key: this.key}).save();
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
      const file = buffer || fs.readFileSync(filePath);
      const response = await this.getClient().send(new PutObjectCommand({
        Bucket: this.getBucketName(),
        Key: this.key,
        StorageClass: storageClass,
        Body: file,
      }));

      if (response.$metadata.httpStatusCode === 200) return;

      this.newLog('upload').setResponse({status: response.$metadata?.httpStatusCode || 45})
        .setSideData({key: this.key}).save();
    } catch (error) {
      this.newLog('upload').setError(error as Error).setSideData({key: this.key}).setResponse({status: 46}).save();
    }

    throw 'Error storing file';
  }

  async exists(): Promise<boolean> {
    try {
      const bucketParams: HeadObjectCommandInput = {
        Bucket: this.getBucketName(),
        Key: this.key,
      };
      const cmd = new HeadObjectCommand(bucketParams);
      const response: HeadObjectCommandOutput = await this.getClient().send(cmd);

      return response.$metadata.httpStatusCode === 200;
    } catch (error) {
      if ((error as any).$metadata?.httpStatusCode === 404) {
        // doesn't exist and permission policy includes s3:ListBucket
      } else if ((error as any).$metadata?.httpStatusCode === 403) {
        // doesn't exist, permission policy WITHOUT s3:ListBucket
      } else {
        // some other error
        // ...log and rethrow if you like
      }
    }
    return false;
  }
}
