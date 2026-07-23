export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export type StorageUploadInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
  cacheControl?: string;
};

export type StorageUploadResult = {
  key: string;
  url: string;
};

export interface IStorageProvider {
  isConfigured(): boolean;
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
