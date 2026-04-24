import assert from 'node:assert/strict';
import type { TestGroup } from '../../../scripts/test-types.js';

import {
  appointmentInputSchema,
  budgetInputSchema,
  budgetsQuerySchema,
  clientInputSchema,
  clientsQuerySchema,
  communicationOptInInputSchema,
  contractInputSchema,
  messageSendInputSchema,
  professionalSchema,
} from './index';

export const testGroup: TestGroup = {
  name: 'shared schemas',
  cases: [
    {
      name: 'normalizes optional client fields and coerces priority score',
      run: () => {
    const parsed = clientInputSchema.parse({
      fullName: 'Ana Costa',
      phone: '71999990000',
      email: '',
      priorityScore: '78',
    });

    assert.equal(parsed.email, undefined);
    assert.equal(parsed.priorityScore, 78);
    assert.equal(parsed.lifecycleStage, 'lead');
      },
    },

    {
      name: 'defaults professional locale to pt-BR',
      run: () => {
        const parsed = professionalSchema.parse({
          id: '30f21e3f-e367-42cf-95a2-f325255eb4eb',
          authUserId: '7701c746-24b7-4121-a3cc-686e3631f3d6',
          fullName: 'Ana Costa',
          businessName: 'Studio Ana',
          phone: '71999990000',
          whatsappPhone: '71999990000',
          email: 'ana@example.com',
          createdAt: '2026-04-24T12:00:00.000Z',
        });

        assert.equal(parsed.locale, 'pt-BR');
      },
    },

    {
      name: 'rejects appointments when end is before start',
      run: () => {
        assert.throws(
          () =>
            appointmentInputSchema.parse({
              clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
              title: 'Teste',
              appointmentType: 'trial',
              status: 'scheduled',
              startsAt: '2026-04-23T12:00:00.000Z',
              endsAt: '2026-04-23T11:00:00.000Z',
            }),
          /posterior/,
        );
      },
    },

    {
      name: 'keeps budget defaults and requires at least one item',
      run: () => {
        const parsed = budgetInputSchema.parse({
          clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
          eventId: '6500fadc-60c2-4c7f-b602-795f2d7258f4',
          items: [
            {
              description: 'Pacote social',
              quantity: '2',
              unitPrice: '150',
            },
          ],
        });

        assert.equal(parsed.status, 'draft');
        assert.equal(parsed.currency, 'BRL');
        assert.equal(parsed.items[0].quantity, 2);
        assert.equal(parsed.items[0].unitPrice, 150);
      },
    },

    {
      name: 'applies query defaults for clients and budgets',
      run: () => {
        const clientsQuery = clientsQuerySchema.parse({});
        const budgetsQuery = budgetsQuerySchema.parse({});

        assert.equal(clientsQuery.orderBy, 'updatedAt');
        assert.equal(clientsQuery.orderDirection, 'desc');
        assert.equal(budgetsQuery.orderBy, 'createdAt');
        assert.equal(budgetsQuery.orderDirection, 'desc');
      },
    },

    {
      name: 'requires event linkage for contract creation',
      run: () => {
        const parsed = contractInputSchema.parse({
          clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
          eventId: '6500fadc-60c2-4c7f-b602-795f2d7258f4',
        });

        assert.equal(parsed.status, 'uploaded');
      },
    },

    {
      name: 'validates opt-in input and normalizes manual channel defaults',
      run: () => {
        const parsed = communicationOptInInputSchema.parse({
          clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
          status: 'opted_in',
        });

        assert.equal(parsed.channel, 'whatsapp');
        assert.equal(parsed.source, 'manual');
      },
    },

    {
      name: 'requires body or template when sending a message',
      run: () => {
        assert.throws(
          () =>
            messageSendInputSchema.parse({
              clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
            }),
          /texto de resposta|template/i,
        );
      },
    },
  ],
};
