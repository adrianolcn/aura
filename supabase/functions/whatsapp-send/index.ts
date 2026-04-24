import {
  authenticateRequest,
  getClientById,
  getConversationById,
  getTemplateById,
  jsonResponse,
  registerIntegrationLog,
  sendPersistedMessage,
} from '../_shared/communications.ts';
import { captureEdgeError } from '../_shared/observability.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let failureContext: Record<string, unknown> = {};

  try {
    const { service, professional } = await authenticateRequest(request);
    const payload = (await request.json()) as Record<string, unknown>;
    const clientId = typeof payload.clientId === 'string' ? payload.clientId : null;

    if (!clientId) {
      return jsonResponse({ error: 'clientId is required.' }, 400);
    }

    const templateId = typeof payload.templateId === 'string' ? payload.templateId : null;
    const conversationId =
      typeof payload.conversationId === 'string' ? payload.conversationId : null;
    const parameters =
      payload.parameters && typeof payload.parameters === 'object' && !Array.isArray(payload.parameters)
        ? Object.fromEntries(
            Object.entries(payload.parameters as Record<string, unknown>).map(([key, value]) => [
              key,
              String(value ?? ''),
            ]),
          )
        : {};
    const body = typeof payload.body === 'string' ? payload.body : undefined;
    const eventId = typeof payload.eventId === 'string' ? payload.eventId : undefined;
    failureContext = {
      clientId,
      templateId,
      conversationId,
      eventId,
      bodyPreview: body?.slice(0, 120) ?? null,
    };

    const [client, conversation, template] = await Promise.all([
      getClientById(service, professional.id, clientId),
      conversationId ? getConversationById(service, professional.id, conversationId) : Promise.resolve(null),
      templateId ? getTemplateById(service, professional.id, templateId) : Promise.resolve(null),
    ]);

    if (templateId && !template) {
      return jsonResponse({ error: 'Template not found.' }, 404);
    }

    const result = await sendPersistedMessage({
      service,
      professional,
      client,
      conversation,
      template,
      body,
      parameters,
      eventId,
      source: 'manual',
    });

    return jsonResponse({
      conversation: result.conversation,
      message: result.message,
      externalMessageId: result.externalMessageId,
    });
  } catch (reason) {
    if (reason instanceof Response) {
      return reason;
    }

    try {
      const { service, professional } = await authenticateRequest(request);
      await registerIntegrationLog(service, {
        professionalId: professional.id,
        clientId:
          typeof failureContext.clientId === 'string'
            ? failureContext.clientId
            : undefined,
        direction: 'outbound',
        logType: 'send',
        eventKey: `failed-send:${Date.now()}`,
        status: 'failed',
        errorMessage: reason instanceof Error ? reason.message : String(reason),
        payload: failureContext,
      });
    } catch {
      console.error('[aura-whatsapp-send]', reason);
    }

    await captureEdgeError(reason, {
      function: 'whatsapp-send',
      ...failureContext,
    });

    return jsonResponse(
      {
        error: reason instanceof Error ? reason.message : 'Unexpected send error.',
      },
      400,
    );
  }
});
