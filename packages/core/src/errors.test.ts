import assert from 'node:assert/strict';
import type { TestGroup } from '../../../scripts/test-types.js';

import { AppError, toAppError, toUserMessage } from './errors';

export const testGroup: TestGroup = {
  name: 'error helpers',
  cases: [
    {
      name: 'preserves app errors',
      run: () => {
        const error = new AppError({
          code: 'validation_error',
          message: 'Bad payload',
          userMessage: 'Confira os campos obrigatórios.',
        });

        assert.equal(toAppError(error), error);
        assert.equal(toUserMessage(error), 'Confira os campos obrigatórios.');
      },
    },

    {
      name: 'wraps unexpected errors with a friendly message',
      run: () => {
        const wrapped = toAppError(new Error('db exploded'), 'Falha amigável');

        assert.ok(wrapped instanceof AppError);
        assert.equal(wrapped.userMessage, 'Falha amigável');
        assert.equal(
          toUserMessage(new Error('db exploded'), 'Falha amigável'),
          'Falha amigável',
        );
      },
    },
  ],
};
