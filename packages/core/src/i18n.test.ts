import assert from 'node:assert/strict';

import type { TestGroup } from '../../../scripts/test-types.js';

import { normalizeLocale, translate } from './i18n.js';

export const testGroup: TestGroup = {
  name: 'i18n helpers',
  cases: [
    {
      name: 'falls back to pt-BR when locale is invalid',
      run: () => {
        assert.equal(normalizeLocale('es-ES'), 'pt-BR');
      },
    },
    {
      name: 'translates supported keys in english',
      run: () => {
        assert.equal(translate('en-US', 'nav.clients'), 'Clients');
      },
    },
    {
      name: 'interpolates translation parameters',
      run: () => {
        assert.equal(
          translate('pt-BR', 'dashboard.actingAs', {
            businessName: 'Studio',
            tenantId: 'tenant-1',
          }),
          'Operando como Studio • tenant tenant-1',
        );
      },
    },
  ],
};
