import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StorageService } from './storage.service';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn((input: unknown) => ({ input })),
  DeleteObjectCommand: jest.fn((input: unknown) => ({ input })),
}));

function buildService(values: Record<string, string | undefined>) {
  const config = { get: jest.fn((key: string) => values[key]) };
  const service = new StorageService(config as never);
  return { service, config };
}

describe('StorageService — sandbox mode (no S3 configured)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is not configured when the S3 env vars are missing', () => {
    const { service } = buildService({
      backendPublicUrl: 'http://localhost:3001',
    });
    expect(service.isConfigured).toBe(false);
  });

  it('writes the file to local disk and returns a URL under backendPublicUrl/uploads', async () => {
    const { service } = buildService({
      backendPublicUrl: 'http://localhost:3001',
    });

    const url = await service.upload(
      'patients/p1/documents/file.png',
      Buffer.from('data'),
      'image/png',
    );

    expect(url).toBe(
      'http://localhost:3001/uploads/patients/p1/documents/file.png',
    );
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining(join('patients', 'p1', 'documents', 'file.png')),
      Buffer.from('data'),
    );
  });

  it('keyFromUrl recovers the key from a local-disk URL', () => {
    const { service } = buildService({
      backendPublicUrl: 'http://localhost:3001',
    });

    const key = service.keyFromUrl(
      'http://localhost:3001/uploads/patients/p1/documents/file.png',
    );

    expect(key).toBe('patients/p1/documents/file.png');
  });

  it('delete swallows an already-missing file instead of throwing', async () => {
    const { service } = buildService({
      backendPublicUrl: 'http://localhost:3001',
    });
    (unlink as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));

    await expect(service.delete('missing-key')).resolves.toBeUndefined();
  });
});

describe('StorageService — configured with S3', () => {
  function buildConfiguredService() {
    return buildService({
      's3.endpoint': 'https://fra1.digitaloceanspaces.com',
      's3.bucket': 'dentalflow',
      's3.accessKey': 'key',
      's3.secretKey': 'secret',
      's3.region': 'us-east-1',
      backendPublicUrl: 'http://localhost:3001',
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is configured when all S3 env vars are present', () => {
    const { service } = buildConfiguredService();
    expect(service.isConfigured).toBe(true);
  });

  it('uploads via the S3 client and returns an endpoint/bucket/key URL', async () => {
    const { service } = buildConfiguredService();

    const url = await service.upload(
      'patients/p1/documents/file.png',
      Buffer.from('data'),
      'image/png',
    );

    expect(url).toBe(
      'https://fra1.digitaloceanspaces.com/dentalflow/patients/p1/documents/file.png',
    );
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('keyFromUrl recovers the key from an S3 URL', () => {
    const { service } = buildConfiguredService();

    const key = service.keyFromUrl(
      'https://fra1.digitaloceanspaces.com/dentalflow/patients/p1/documents/file.png',
    );

    expect(key).toBe('patients/p1/documents/file.png');
  });
});
