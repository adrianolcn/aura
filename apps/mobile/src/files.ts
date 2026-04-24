import * as DocumentPicker from 'expo-document-picker';

import type { UploadableFile } from '@aura/core';

export type PickedFile = UploadableFile & {
  uri: string;
};

export async function pickSingleFile(type: string | string[]) {
  const result = await DocumentPicker.getDocumentAsync({
    type,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const response = await fetch(asset.uri);
  const data = await response.arrayBuffer();

  return {
    uri: asset.uri,
    fileName: asset.name,
    contentType: asset.mimeType ?? 'application/octet-stream',
    data,
    sizeBytes: asset.size ?? data.byteLength,
  } satisfies PickedFile;
}
