import assert from 'node:assert/strict';
import type { TestGroup } from '../../../scripts/test-types.js';

import {
  buildWhatsAppTemplatePayload,
  buildWhatsAppTextPayload,
  getWebhookVerificationResponse,
  normalizePhone,
  parseWhatsAppWebhookEvents,
  sendWhatsAppCloudRequest,
} from './whatsapp';

export const testGroup: TestGroup = {
  name: 'whatsapp helpers',
  cases: [
    {
      name: 'normalizes brazilian phone numbers',
      run: () => {
        assert.equal(normalizePhone('+55 (71) 99123-8801'), '5571991238801');
      },
    },
    {
      name: 'builds template payload with ordered parameters',
      run: () => {
        const payload = buildWhatsAppTemplatePayload({
          toPhone: '+55 71 99123-8801',
          templateName: 'aura_trial_reminder',
          languageCode: 'pt_BR',
          variableOrder: ['client_name', 'appointment_time'],
          parameters: {
            client_name: 'Marina',
            appointment_time: '10:00',
          },
        });

        assert.equal(payload.template.name, 'aura_trial_reminder');
        assert.equal(payload.to, '5571991238801');
        assert.deepEqual(payload.template.components[0]?.parameters, [
          { type: 'text', text: 'Marina' },
          { type: 'text', text: '10:00' },
        ]);
      },
    },
    {
      name: 'parses inbound and status webhook events',
      run: () => {
        const events = parseWhatsAppWebhookEvents({
          entry: [
            {
              changes: [
                {
                  value: {
                    metadata: {
                      phone_number_id: '123456',
                    },
                    contacts: [
                      {
                        wa_id: '5571991238801',
                        profile: {
                          name: 'Marina Alves',
                        },
                      },
                    ],
                    messages: [
                      {
                        from: '5571991238801',
                        id: 'wamid.inbound',
                        timestamp: '1713892200',
                        type: 'text',
                        text: {
                          body: 'Oi, tudo bem?',
                        },
                      },
                    ],
                    statuses: [
                      {
                        id: 'wamid.outbound',
                        recipient_id: '5571991238801',
                        status: 'delivered',
                        timestamp: '1713892260',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        });

        assert.equal(events.length, 2);
        assert.equal(events[0]?.eventType, 'message');
        assert.equal(events[1]?.eventType, 'status');
      },
    },
    {
      name: 'returns verification challenge only with matching token',
      run: () => {
        const success = getWebhookVerificationResponse(
          new URLSearchParams({
            'hub.mode': 'subscribe',
            'hub.verify_token': 'secret',
            'hub.challenge': '12345',
          }),
          'secret',
        );
        const failure = getWebhookVerificationResponse(
          new URLSearchParams({
            'hub.mode': 'subscribe',
            'hub.verify_token': 'wrong',
            'hub.challenge': '12345',
          }),
          'secret',
        );

        assert.equal(success.status, 200);
        assert.equal(success.body, '12345');
        assert.equal(failure.status, 403);
      },
    },
    {
      name: 'builds text payload without preview url',
      run: () => {
        const payload = buildWhatsAppTextPayload({
          toPhone: '+55 71 99123-8801',
          body: 'Mensagem livre',
        });

        assert.equal(payload.text.body, 'Mensagem livre');
        assert.equal(payload.text.preview_url, false);
      },
    },
    {
      name: 'retries transient WhatsApp Cloud API errors before succeeding',
      run: async () => {
        const originalFetch = globalThis.fetch;
        let attempt = 0;

        globalThis.fetch = (async () => {
          attempt += 1;

          if (attempt === 1) {
            return new Response(
              JSON.stringify({
                error: {
                  message: 'temporarily unavailable',
                },
              }),
              {
                status: 503,
                headers: {
                  'Content-Type': 'application/json',
                },
              },
            );
          }

          return new Response(
            JSON.stringify({
              messages: [{ id: 'wamid.retry-success' }],
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          );
        }) as typeof globalThis.fetch;

        try {
          const response = await sendWhatsAppCloudRequest(
            {
              accessToken: 'token',
              phoneNumberId: '123',
              apiVersion: 'v22.0',
              maxRetries: 1,
            },
            {
              messaging_product: 'whatsapp',
            },
          );

          assert.equal(attempt, 2);
          assert.equal((response?.messages as Array<{ id: string }>)[0]?.id, 'wamid.retry-success');
        } finally {
          globalThis.fetch = originalFetch;
        }
      },
    },
  ],
};
