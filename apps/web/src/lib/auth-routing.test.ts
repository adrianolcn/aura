import assert from 'node:assert/strict';
import type { TestGroup } from '../../../../scripts/test-types.js';

import { isProtectedPath, resolveSessionRedirect } from './auth-routing';

export const testGroup: TestGroup = {
  name: 'auth routing',
  cases: [
    {
      name: 'marks workspace routes as protected',
      run: () => {
        assert.equal(isProtectedPath('/'), true);
        assert.equal(isProtectedPath('/clients/123'), true);
        assert.equal(isProtectedPath('/login'), false);
      },
    },

    {
      name: 'redirects unauthenticated users to login',
      run: () => {
        assert.equal(resolveSessionRedirect('/clients', false), '/login');
        assert.equal(resolveSessionRedirect('/agenda', false), '/login');
      },
    },

    {
      name: 'redirects authenticated users away from login',
      run: () => {
        assert.equal(resolveSessionRedirect('/login', true), '/dashboard');
      },
    },

    {
      name: 'keeps public routes unchanged when no redirect is needed',
      run: () => {
        assert.equal(resolveSessionRedirect('/login', false), null);
        assert.equal(resolveSessionRedirect('/dashboard', true), null);
      },
    },
  ],
};
