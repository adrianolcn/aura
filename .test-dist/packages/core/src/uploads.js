"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStoragePath = buildStoragePath;
exports.formatFileSize = formatFileSize;
exports.describeFile = describeFile;
exports.uploadStorageFile = uploadStorageFile;
exports.removeStorageFile = removeStorageFile;
exports.createSignedStorageUrl = createSignedStorageUrl;
exports.resolveDocumentBucket = resolveDocumentBucket;
exports.useSignedStorageUrl = useSignedStorageUrl;
const react_1 = require("react");
const errors_1 = require("./errors");
function sanitizeSegment(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
}
function buildStoragePath(input) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = sanitizeSegment(input.fileName);
    const folder = input.folder ? `${sanitizeSegment(input.folder)}/` : '';
    return `${input.professionalId}/${input.clientId}/${folder}${stamp}-${fileName}`;
}
function formatFileSize(sizeBytes) {
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
function describeFile(input) {
    return `${input.fileName} • ${input.mimeType} • ${formatFileSize(input.sizeBytes)}`;
}
async function uploadStorageFile(client, input) {
    const path = buildStoragePath(input);
    const response = await client.storage
        .from(input.bucket)
        .upload(path, input.data, {
        contentType: input.contentType,
        upsert: false,
    });
    if (response.error) {
        throw new errors_1.AppError({
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
async function removeStorageFile(client, bucket, path) {
    const response = await client.storage.from(bucket).remove([path]);
    if (response.error) {
        throw new errors_1.AppError({
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
async function createSignedStorageUrl(client, bucket, path, expiresIn = 60 * 15) {
    const response = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (response.error || !response.data?.signedUrl) {
        throw new errors_1.AppError({
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
function resolveDocumentBucket(document) {
    return document.documentType === 'contract' ? 'contracts' : 'documents';
}
function useSignedStorageUrl(client, bucket, path, expiresIn = 60 * 15) {
    const [url, setUrl] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
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
            .catch((reason) => {
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
