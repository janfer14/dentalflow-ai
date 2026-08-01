import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const LOCAL_UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string | undefined;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('s3.endpoint');
    const bucket = this.config.get<string>('s3.bucket');
    const accessKeyId = this.config.get<string>('s3.accessKey');
    const secretAccessKey = this.config.get<string>('s3.secretKey');

    this.bucket = bucket;
    this.client =
      endpoint && bucket && accessKeyId && secretAccessKey
        ? new S3Client({
            endpoint,
            region: this.config.get<string>('s3.region'),
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true,
          })
        : null;

    if (!this.client) {
      this.logger.warn(
        '[Storage sandbox] S3 no configurado — los archivos se guardan en disco local (./uploads), no en un bucket real. Define S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY y S3_SECRET_KEY para producción.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    if (this.client && this.bucket) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
        }),
      );
      const endpoint = this.config
        .get<string>('s3.endpoint')!
        .replace(/\/$/, '');
      return `${endpoint}/${this.bucket}/${key}`;
    }

    const destination = join(LOCAL_UPLOADS_DIR, key);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, buffer);
    const backendPublicUrl = this.config.get<string>('backendPublicUrl');
    return `${backendPublicUrl}/uploads/${key}`;
  }

  /** Recovers the storage key from a URL previously returned by `upload()`. */
  keyFromUrl(url: string): string {
    const prefix =
      this.client && this.bucket
        ? `${this.config.get<string>('s3.endpoint')!.replace(/\/$/, '')}/${this.bucket}/`
        : `${this.config.get<string>('backendPublicUrl')}/uploads/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : url;
  }

  async delete(key: string): Promise<void> {
    if (this.client && this.bucket) {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return;
    }

    try {
      await unlink(join(LOCAL_UPLOADS_DIR, key));
    } catch {
      // Already gone (or never persisted) — deleting the DB row is what
      // actually matters to the caller.
    }
  }
}
