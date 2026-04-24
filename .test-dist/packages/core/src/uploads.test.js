"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const uploads_1 = require("./uploads");
exports.testGroup = {
    name: 'upload helpers',
    cases: [
        {
            name: 'builds tenant-scoped storage paths',
            run: () => {
                const path = (0, uploads_1.buildStoragePath)({
                    bucket: 'contracts',
                    professionalId: 'tenant-1',
                    clientId: 'client-9',
                    folder: 'contratos finais',
                    fileName: 'Contrato Noiva 2026.pdf',
                    contentType: 'application/pdf',
                    data: new ArrayBuffer(8),
                });
                strict_1.default.match(path, /^tenant-1\/client-9\/contratos-finais\//);
                strict_1.default.match(path, /contrato-noiva-2026.pdf$/);
            },
        },
        {
            name: 'formats file metadata for display',
            run: () => {
                strict_1.default.equal((0, uploads_1.formatFileSize)(512), '512 B');
                strict_1.default.equal((0, uploads_1.formatFileSize)(2048), '2.0 KB');
                strict_1.default.equal((0, uploads_1.formatFileSize)(1048576), '1.0 MB');
                strict_1.default.equal((0, uploads_1.describeFile)({
                    fileName: 'briefing.pdf',
                    mimeType: 'application/pdf',
                    sizeBytes: 2048,
                }), 'briefing.pdf • application/pdf • 2.0 KB');
            },
        },
    ],
};
