import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IStorageProvider, StorageUploadInput, StorageUploadResult } from './storage.interface';

@Injectable()
export class R2StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.uploadBaseUrl && this.publicBaseUrl);
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('R2 storage is not configured');
    }

    const objectKey = this.normalizeKey(input.key);
    const response = await fetch(this.buildUploadUrl(objectKey), {
      method: 'PUT',
      headers: {
        'Content-Type': input.contentType,
        ...(input.cacheControl ? { 'Cache-Control': input.cacheControl } : {}),
        ...(this.uploadApiToken ? { Authorization: `Bearer ${this.uploadApiToken}` } : {}),
      },
      body: new Blob([this.toArrayBuffer(input.body)], { type: input.contentType }),
    });

    if (!response.ok) {
      const body = await this.readBody(response);
      this.logger.error(`R2 upload failed (${response.status}): ${body}`);
      throw new ServiceUnavailableException('Unable to upload object to R2');
    }

    return {
      key: objectKey,
      url: this.getPublicUrl(objectKey),
    };
  }

  async delete(key: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const objectKey = this.normalizeKey(key);
    const response = await fetch(this.buildUploadUrl(objectKey), {
      method: 'DELETE',
      headers: this.uploadApiToken ? { Authorization: `Bearer ${this.uploadApiToken}` } : undefined,
    });

    if (!response.ok && response.status !== 404) {
      const body = await this.readBody(response);
      this.logger.error(`R2 delete failed (${response.status}): ${body}`);
      throw new ServiceUnavailableException('Unable to delete object from R2');
    }
  }

  getPublicUrl(key: string): string {
    if (!this.publicBaseUrl) {
      throw new ServiceUnavailableException('R2 public base URL is not configured');
    }

    const objectKey = this.normalizeKey(key);
    return `${this.publicBaseUrl}/${objectKey}`;
  }

  private get uploadBaseUrl(): string | undefined {
    return this.config.get<string>('R2_UPLOAD_BASE_URL')?.replace(/\/+$/, '');
  }

  private get publicBaseUrl(): string | undefined {
    return this.config.get<string>('R2_PUBLIC_BASE_URL')?.replace(/\/+$/, '');
  }

  private get uploadApiToken(): string | undefined {
    return this.config.get<string>('R2_UPLOAD_API_TOKEN');
  }

  private buildUploadUrl(objectKey: string): string {
    if (!this.uploadBaseUrl) {
      throw new ServiceUnavailableException('R2 upload base URL is not configured');
    }

    return `${this.uploadBaseUrl}/${objectKey}`;
  }

  private normalizeKey(key: string): string {
    return key
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }

  private async readBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '<unreadable>';
    }
  }
}
