import assert from 'node:assert/strict';
import type { TestGroup } from '../../../scripts/test-types.js';

import { buildStoragePath, describeFile, formatFileSize } from './uploads';

export const testGroup: TestGroup = {
  name: 'upload helpers',
  cases: [
    {
      name: 'builds tenant-scoped storage paths',
      run: () => {
        const path = buildStoragePath({
          bucket: 'contracts',
          professionalId: 'tenant-1',
          clientId: 'client-9',
          folder: 'contratos finais',
          fileName: 'Contrato Noiva 2026.pdf',
          contentType: 'application/pdf',
          data: new ArrayBuffer(8),
        });

        assert.match(path, /^tenant-1\/client-9\/contratos-finais\//);
        assert.match(path, /contrato-noiva-2026.pdf$/);
      },
    },

    {
      name: 'formats file metadata for display',
      run: () => {
        assert.equal(formatFileSize(512), '512 B');
        assert.equal(formatFileSize(2048), '2.0 KB');
        assert.equal(formatFileSize(1048576), '1.0 MB');
        assert.equal(
          describeFile({
            fileName: 'briefing.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
          }),
          'briefing.pdf • application/pdf • 2.0 KB',
        );
      },
    },
  ],
};
