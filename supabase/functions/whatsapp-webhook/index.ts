import {
  createInboundMessage,
  createServiceClient,
  ensureConversation,
  jsonResponse,
  recordMessageStatus,
  registerIntegrationLog,
  resolveClientByPhone,
  resolveProfessionalByWhatsApp,
  updateConversationSnapshot,
  updateIntegrationLog,
  updateMessageDelivery,
} from '../_shared/communications.ts';
import { captureEdgeError, captureEdgeMessage } from '../_shared/observability.ts';
import {
  getWebhookVerificationResponse,
  parseWhatsAppWebhookEvents,
} from '../../../packages/core/src/whatsapp.ts';

Deno.serve(async (request) => {
  if (request.method === 'GET') {
    const verification = getWebhookVerificationResponse(
      new URL(request.url).searchParams,
      Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?? undefined,
    );

    await captureEdgeMessage('whatsapp-webhook-verification', {
      status: verification.status,
      ok: verification.ok,
    });

    return new Response(verification.body, { status: verification.status });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const service = createServiceClient();

  try {
    const payload = await request.json();
    const events = parseWhatsAppWebhookEvents(payload);
    const results: Array<Record<string, unknown>> = [];

    for (const event of events) {
      const professional = await resolveProfessionalByWhatsApp(service, {
        phoneNumberId: event.phoneNumberId,
      });

      if (!professional) {
        results.push({
          eventType: event.eventType,
          externalMessageId: event.externalMessageId,
          status: 'ignored_professional_not_found',
        });
        continue;
      }

      const eventKey =
        event.eventType === 'message'
          ? `webhook:message:${event.externalMessageId}`
          : `webhook:status:${event.externalMessageId}:${event.status}:${event.occurredAt}`;

      const log = await registerIntegrationLog(service, {
        professionalId: professional.id,
        direction: event.eventType === 'message' ? 'inbound' : 'system',
        logType: event.eventType === 'message' ? 'webhook' : 'status',
        eventKey,
        status: 'received',
        payload:
          event.rawPayload && typeof event.rawPayload === 'object' && !Array.isArray(event.rawPayload)
            ? (event.rawPayload as Record<string, string | number | boolean | null | object>)
            : {},
      });

      if (!log.inserted || !log.row) {
        results.push({
          eventType: event.eventType,
          externalMessageId: event.externalMessageId,
          status: 'duplicate_skipped',
        });
        continue;
      }

      try {
        if (event.eventType === 'message') {
          const client = await resolveClientByPhone(
            service,
            professional.id,
            event.fromPhone,
          );

          if (!client) {
            await updateIntegrationLog(service, String((log.row as Record<string, unknown>).id), {
              status: 'failed',
              errorMessage: 'Client not found for inbound phone.',
            });
            results.push({
              eventType: event.eventType,
              externalMessageId: event.externalMessageId,
              status: 'client_not_found',
            });
            continue;
          }

          const conversation = await ensureConversation(service, {
            professionalId: professional.id,
            clientId: client.id,
            clientPhone: client.phone,
            externalThreadId: event.externalThreadId,
            lastMessageAt: event.receivedAt,
            lastMessagePreview: event.body,
            lastMessageDirection: 'inbound',
            lastMessageStatus: 'received',
          });

          const message = await createInboundMessage(service, {
            professionalId: professional.id,
            clientId: client.id,
            conversationId: conversation.id,
            body: event.body,
            externalMessageId: event.externalMessageId,
            contactName: event.contactName,
            occurredAt: event.receivedAt,
            rawPayload:
              event.rawPayload && typeof event.rawPayload === 'object' && !Array.isArray(event.rawPayload)
                ? (event.rawPayload as Record<string, string | number | boolean | null | object>)
                : {},
          });

          await updateConversationSnapshot(service, conversation.id, {
            externalThreadId: event.externalThreadId,
            lastMessageAt: event.receivedAt,
            lastMessagePreview: event.body,
            lastMessageDirection: 'inbound',
            lastMessageStatus: 'received',
          });

          await updateIntegrationLog(service, String((log.row as Record<string, unknown>).id), {
            status: 'processed',
            clientId: client.id,
            conversationId: conversation.id,
            messageId: message.id,
            response: {
              persisted: true,
            },
          });

          results.push({
            eventType: event.eventType,
            externalMessageId: event.externalMessageId,
            status: 'processed',
            clientId: client.id,
            conversationId: conversation.id,
            messageId: message.id,
          });
          continue;
        }

        const messageResponse = await service
          .from('messages')
          .select('*')
          .eq('professional_id', professional.id)
          .eq('channel', 'whatsapp')
          .eq('external_message_id', event.externalMessageId)
          .maybeSingle();

        if (messageResponse.error || !messageResponse.data) {
          await updateIntegrationLog(service, String((log.row as Record<string, unknown>).id), {
            status: 'skipped',
            errorMessage: 'Message not found for status update.',
          });
          results.push({
            eventType: event.eventType,
            externalMessageId: event.externalMessageId,
            status: 'message_not_found',
          });
          continue;
        }

        const messageRow = messageResponse.data as Record<string, unknown>;
        const updatedMessage = await updateMessageDelivery(service, {
          messageId: String(messageRow.id),
          status: event.status,
          occurredAt: event.occurredAt,
          errorMessage: event.errorMessage,
        });

        await recordMessageStatus(service, {
          professionalId: professional.id,
          clientId: String(messageRow.client_id),
          conversationId: String(messageRow.conversation_id),
          messageId: String(messageRow.id),
          externalMessageId: event.externalMessageId,
          status: event.status,
          occurredAt: event.occurredAt,
          payload:
            event.rawPayload && typeof event.rawPayload === 'object' && !Array.isArray(event.rawPayload)
              ? (event.rawPayload as Record<string, string | number | boolean | null | object>)
              : {},
        });

        await updateConversationSnapshot(service, String(messageRow.conversation_id), {
          lastMessageAt: event.occurredAt,
          lastMessagePreview: String(messageRow.body),
          lastMessageDirection: String(messageRow.direction) === 'inbound' ? 'inbound' : 'outbound',
          lastMessageStatus: event.status,
        });

        await updateIntegrationLog(service, String((log.row as Record<string, unknown>).id), {
          status: 'processed',
          clientId: String(messageRow.client_id),
          conversationId: String(messageRow.conversation_id),
          messageId: updatedMessage.id,
          response: {
            messageStatus: event.status,
          },
        });

        results.push({
          eventType: event.eventType,
          externalMessageId: event.externalMessageId,
          status: 'processed',
          messageStatus: event.status,
        });
      } catch (reason) {
        await updateIntegrationLog(service, String((log.row as Record<string, unknown>).id), {
          status: 'failed',
          errorMessage: reason instanceof Error ? reason.message : String(reason),
        });
        results.push({
          eventType: event.eventType,
          externalMessageId: event.externalMessageId,
          status: 'failed',
          error: reason instanceof Error ? reason.message : String(reason),
        });
      }
    }

    return jsonResponse({
      processed: results,
      count: results.length,
    });
  } catch (reason) {
    console.error('[aura-whatsapp-webhook]', reason);
    await captureEdgeError(reason, {
      function: 'whatsapp-webhook',
    });
    return jsonResponse(
      {
        error: reason instanceof Error ? reason.message : 'Unexpected webhook error.',
      },
      400,
    );
  }
});
