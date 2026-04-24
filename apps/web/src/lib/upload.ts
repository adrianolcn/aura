import type { UploadableFile } from '@aura/core';

export async function fileToUploadable(file: File): Promise<UploadableFile> {
  return {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    data: await file.arrayBuffer(),
    sizeBytes: file.size,
  };
}

export function isoToDateTimeLocal(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const pad = (segment: number) => String(segment).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dateTimeLocalToIso(value: string) {
  return new Date(value).toISOString();
}
