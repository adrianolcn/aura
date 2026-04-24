import { useEffect, useState } from 'react';

import type { ClientDocument } from '@aura/types';

import type { AuraSupabaseClient } from './supabase';
import { AppError } from './errors';

export type StorageBucket = 'client-media' | 'contracts' | 'documents';

export type StorageUploadInput = {
  bucket: StorageBucket;
  professionalId: string;
  clientId: string;
  fileName: string;
  contentType: string;
  data: ArrayBuffer;
  folder?: string;
};

export type FileDescriptor = {
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

function sanitizeSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function buildStoragePath(input: StorageUploadInput) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = sanitizeSegment(input.fileName);
  const folder = input.folder ? `${sanitizeSegment(input.folder)}/` : '';

  return `${input.professionalId}/${input.clientId}/${folder}${stamp}-${fileName}`;
}

export function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes) {
    return 'tamanho não informado';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function describeFile(input: FileDescriptor) {
  return `${input.fileName} • ${input.mimeType} • ${formatFileSize(input.sizeBytes)}`;
}

export async function uploadStorageFile(
  client: AuraSupabaseClient,
  input: StorageUploadInput,
) {
  const path = buildStoragePath(input);
  const response = await client.storage
    .from(input.bucket)
    .upload(path, input.data, {
      contentType: input.contentType,
      upsert: false,
    });

  if (response.error) {
    throw new AppError({
      code: 'storage_error',
      message: response.error.message,
      userMessage: 'O upload falhou. Confira o arquivo e tente novamente.',
      details: {
        bucket: input.bucket,
        path,
      },
      cause: response.error,
    });
  }

  return {
    path,
    fullPath: response.data.path,
  };
}

export async function removeStorageFile(
  client: AuraSupabaseClient,
  bucket: StorageBucket,
  path: string,
) {
  const response = await client.storage.from(bucket).remove([path]);
  if (response.error) {
    throw new AppError({
      code: 'storage_error',
      message: response.error.message,
      userMessage: 'Não foi possível remover o arquivo no armazenamento.',
      details: {
        bucket,
        path,
      },
      cause: response.error,
    });
  }
}

export async function createSignedStorageUrl(
  client: AuraSupabaseClient,
  bucket: StorageBucket,
  path: string,
  expiresIn = 60 * 15,
) {
  const response = await client.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (response.error || !response.data?.signedUrl) {
    throw new AppError({
      code: 'storage_error',
      message: response.error?.message ?? 'Signed URL unavailable',
      userMessage: 'Não foi possível abrir o arquivo agora. Tente novamente em instantes.',
      details: {
        bucket,
        path,
      },
      cause: response.error,
    });
  }

  return response.data.signedUrl;
}

export function resolveDocumentBucket(document: Pick<ClientDocument, 'documentType'>): StorageBucket {
  return document.documentType === 'contract' ? 'contracts' : 'documents';
}

export function useSignedStorageUrl(
  client: AuraSupabaseClient | null,
  bucket: StorageBucket,
  path?: string,
  expiresIn = 60 * 15,
) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !path) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    createSignedStorageUrl(client, bucket, path, expiresIn)
      .then((signedUrl) => {
        if (active) {
          setUrl(signedUrl);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o arquivo.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [bucket, client, expiresIn, path]);

  return {
    url,
    loading,
    error,
  };
}
