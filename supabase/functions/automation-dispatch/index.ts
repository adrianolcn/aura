import {
  assertJobSecret,
  authenticateRequest,
  createServiceClient,
  findOptIn,
  getClientById,
  jsonResponse,
  registerIntegrationLog,
  sendPersistedMessage,
} from '../_shared/communications.ts';
import { captureEdgeError, captureEdgeMessage } from '../_shared/observability.ts';

type RuleRow = {
  id: string;
  professional_id: string;
  name: string;
  trigger_type: string;
  template_id?: string | null;
  event_offset_minutes: number;
  is_active: boolean;
  requires_opt_in: boolean;
  payload?: Record<string, unknown> | null;
};

type AppointmentRow = {
  id: string;
  professional_id: string;
  client_id: string;
  event_id?: string | null;
  title: string;
  appointment_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  professional_id: string;
  client_id: string;
  title: string;
  event_type: string;
  event_date: string;
  status: string;
  location?: string | null;
  created_at: string;
};

type DispatchRunRow = {
  id: string;
  execution_key: string;
};

type TriggerSource = 'manual' | 'scheduler' | 'retry';

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

function isDue(scheduledFor: string, now: number) {
  return new Date(scheduledFor).getTime() <= now;
}

function toMinuteBucketIso(date = new Date()) {
  date.setSeconds(0, 0);
  return date.toISOString();
}

function resolveTriggerSource(
  mode: unknown,
  authenticated: boolean,
): TriggerSource {
  if (mode === 'retry') {
    return 'retry';
  }

  if (mode === 'manual' || authenticated) {
    return 'manual';
  }

  return 'scheduler';
}

function buildExecutionKey(input: {
  triggerSource: TriggerSource;
  professionalId: string;
  requestedClientId?: string;
  providedKey?: string;
}) {
  if (input.providedKey?.trim()) {
    return input.providedKey.trim();
  }

  return [
    input.triggerSource,
    input.professionalId,
    input.requestedClientId ?? 'all',
    toMinuteBucketIso(),
  ].join(':');
}

function buildParameters(input: {
  client: { full_name: string };
  professional: { full_name: string; business_name: string };
  appointment?: AppointmentRow;
  event?: EventRow;
}) {
  const appointmentDate = input.appointment?.starts_at
    ? new Date(input.appointment.starts_at)
    : null;
  const eventDate = input.event?.event_date ? new Date(input.event.event_date) : null;

  return {
    client_name: input.client.full_name,
    professional_name: input.professional.full_name,
    business_name: input.professional.business_name,
    appointment_title: input.appointment?.title ?? '',
    appointment_date: appointmentDate
      ? appointmentDate.toLocaleDateString('pt-BR')
      : '',
    appointment_time: appointmentDate
      ? appointmentDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    event_title: input.event?.title ?? input.appointment?.title ?? '',
    event_date: eventDate ? eventDate.toLocaleDateString('pt-BR') : '',
    event_time: eventDate
      ? eventDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    location: input.appointment?.location ?? input.event?.location ?? '',
  };
}

async function createDispatchRun(
  service: ReturnType<typeof createServiceClient>,
  input: {
    professionalId: string;
    triggerSource: TriggerSource;
    executionKey: string;
    metadata?: Record<string, unknown>;
  },
) {
  const response = await service
    .from('automation_dispatch_runs')
    .upsert(
      {
        professional_id: input.professionalId,
        trigger_source: input.triggerSource,
        execution_key: input.executionKey,
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: input.metadata ?? {},
      },
      {
        onConflict: 'professional_id,execution_key',
        ignoreDuplicates: true,
      },
    )
    .select('*')
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return (response.data ?? null) as DispatchRunRow | null;
}

async function updateDispatchRun(
  service: ReturnType<typeof createServiceClient>,
  runId: string,
  input: {
    status: 'processed' | 'failed' | 'partial';
    processedCount: number;
    skippedCount: number;
    failedCount: number;
    errorMessage?: string;
  },
) {
  const response = await service
    .from('automation_dispatch_runs')
    .update({
      status: input.status,
      processed_count: input.processedCount,
      skipped_count: input.skippedCount,
      failed_count: input.failedCount,
      error_message: input.errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (response.error) {
    throw new Error(response.error.message);
  }
}

async function createNotificationLog(
  service: ReturnType<typeof createServiceClient>,
  input: {
    professionalId: string;
    clientId: string;
    eventId?: string;
    conversationId?: string;
    templateId?: string;
    automationRuleId: string;
    executionKind: string;
    scheduledFor: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  },
) {
  const response = await service
    .from('notification_logs')
    .upsert(
      {
        professional_id: input.professionalId,
        automation_rule_id: input.automationRuleId,
        client_id: input.clientId,
        event_id: input.eventId ?? null,
        conversation_id: input.conversationId ?? null,
        template_id: input.templateId ?? null,
        channel: 'whatsapp',
        execution_kind: input.executionKind,
        status: 'scheduled',
        scheduled_for: input.scheduledFor,
        idempotency_key: input.idempotencyKey,
        metadata: input.metadata ?? {},
      },
      {
        onConflict: 'professional_id,idempotency_key',
        ignoreDuplicates: true,
      },
    )
    .select('*')
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data as { id: string } | null;
}

async function updateNotificationLog(
  service: ReturnType<typeof createServiceClient>,
  notificationLogId: string,
  input: {
    status: 'processed' | 'failed' | 'cancelled' | 'skipped';
    processedAt?: string;
    errorMessage?: string;
    messageId?: string;
    conversationId?: string;
  },
) {
  const response = await service
    .from('notification_logs')
    .update({
      status: input.status,
      processed_at: input.processedAt ?? null,
      error_message: input.errorMessage ?? null,
      message_id: input.messageId ?? null,
      conversation_id: input.conversationId ?? null,
    })
    .eq('id', notificationLogId);

  if (response.error) {
    throw new Error(response.error.message);
  }
}

async function loadProfessionalRules(
  service: ReturnType<typeof createServiceClient>,
  professionalId: string,
) {
  const response = await service
    .from('automation_rules')
    .select('*')
    .eq('professional_id', professionalId)
    .eq('channel', 'whatsapp')
    .eq('is_active', true);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return (response.data ?? []) as RuleRow[];
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload =
    ((await request.json().catch(() => ({}))) as Record<string, unknown>) ?? {};
  const requestedClientId =
    typeof payload.clientId === 'string' ? payload.clientId : undefined;
  const providedExecutionKey =
    typeof payload.executionKey === 'string' ? payload.executionKey : undefined;
  const authenticated = Boolean(request.headers.get('authorization'));
  const triggerSource = resolveTriggerSource(payload.mode, authenticated);
  const now = Date.now();
  const service = createServiceClient();

  try {
    let professionals: Array<{
      id: string;
      auth_user_id: string;
      full_name: string;
      business_name: string;
      whatsapp_phone: string;
      whatsapp_phone_number_id?: string | null;
    }> = [];

    if (authenticated) {
      const auth = await authenticateRequest(request);
      professionals = [auth.professional];
    } else {
      assertJobSecret(request);
      const professionalsResponse = await service
        .from('professionals')
        .select(
          'id,auth_user_id,full_name,business_name,whatsapp_phone,whatsapp_phone_number_id',
        )
        .not('whatsapp_phone_number_id', 'is', null);

      if (professionalsResponse.error) {
        throw new Error(professionalsResponse.error.message);
      }

      professionals = (professionalsResponse.data ?? []) as Array<{
        id: string;
        auth_user_id: string;
        full_name: string;
        business_name: string;
        whatsapp_phone: string;
        whatsapp_phone_number_id?: string | null;
      }>;
    }

    let processedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const notificationLogIds: string[] = [];
    const dispatchRunIds: string[] = [];

    for (const professional of professionals) {
      const executionKey = buildExecutionKey({
        triggerSource,
        professionalId: professional.id,
        requestedClientId,
        providedKey: providedExecutionKey,
      });
      const dispatchRun = await createDispatchRun(service, {
        professionalId: professional.id,
        triggerSource,
        executionKey,
        metadata: {
          clientId: requestedClientId ?? null,
          mode: typeof payload.mode === 'string' ? payload.mode : null,
        },
      });

      if (!dispatchRun) {
        skippedCount += 1;
        continue;
      }

      dispatchRunIds.push(dispatchRun.id);

      let runProcessedCount = 0;
      let runSkippedCount = 0;
      let runFailedCount = 0;

      await registerIntegrationLog(service, {
        professionalId: professional.id,
        clientId: requestedClientId,
        direction: 'system',
        logType: 'scheduler',
        eventKey: `scheduler:${executionKey}:started`,
        status: 'received',
        payload: {
          clientId: requestedClientId ?? null,
          triggerSource,
        },
      });
      await captureEdgeMessage('automation-dispatch-started', {
        function: 'automation-dispatch',
        professionalId: professional.id,
        clientId: requestedClientId,
        triggerSource,
        executionKey,
      });

      try {
        const rules = await loadProfessionalRules(service, professional.id);
        if (!rules.length) {
          await updateDispatchRun(service, dispatchRun.id, {
            status: 'processed',
            processedCount: 0,
            skippedCount: 0,
            failedCount: 0,
          });
          await registerIntegrationLog(service, {
            professionalId: professional.id,
            clientId: requestedClientId,
            direction: 'system',
            logType: 'scheduler',
            eventKey: `scheduler:${executionKey}:completed`,
            status: 'processed',
            response: {
              processedCount: 0,
              skippedCount: 0,
              failedCount: 0,
              reason: 'no_rules',
            },
          });
          continue;
        }

        const templateIds = rules
          .map((rule) => rule.template_id)
          .filter((templateId): templateId is string => Boolean(templateId));
        const templatesResponse = await service
          .from('message_templates')
          .select('*')
          .in(
            'id',
            templateIds.length
              ? templateIds
              : ['00000000-0000-0000-0000-000000000000'],
          );
        if (templatesResponse.error) {
          throw new Error(templatesResponse.error.message);
        }

        const templatesById = new Map(
          (templatesResponse.data ?? []).map((template) => [
            String(template.id),
            template,
          ]),
        );

        const appointmentRules = rules.filter((rule) =>
          [
            'appointment_confirmation',
            'appointment_reminder',
            'same_day_reminder',
            'trial_reminder',
          ].includes(rule.trigger_type),
        );
        const eventRules = rules.filter((rule) =>
          ['follow_up', 'day_before_guidance'].includes(rule.trigger_type),
        );

        let appointments: AppointmentRow[] = [];
        const listAppointmentsResponse = appointmentRules.length
          ? await service
              .from('appointments')
              .select('*')
              .eq('professional_id', professional.id)
              .gte(
                'starts_at',
                new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
              )
              .lte(
                'starts_at',
                new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
              )
          : null;

        if (listAppointmentsResponse) {
          if (listAppointmentsResponse.error) {
            throw new Error(listAppointmentsResponse.error.message);
          }

          appointments = (listAppointmentsResponse.data ?? []) as AppointmentRow[];
        }

        const eventsResponse = eventRules.length
          ? await service
              .from('client_events')
              .select('*')
              .eq('professional_id', professional.id)
              .gte(
                'event_date',
                new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
              )
              .lte(
                'event_date',
                new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
              )
          : null;

        const events = eventsResponse?.data
          ? ((eventsResponse.data as EventRow[]).filter((event) =>
              requestedClientId ? event.client_id === requestedClientId : true,
            ))
          : [];
        const filteredAppointments = appointments.filter((appointment) =>
          requestedClientId ? appointment.client_id === requestedClientId : true,
        );

        for (const rule of rules) {
          if (!rule.template_id) {
            runSkippedCount += 1;
            skippedCount += 1;
            continue;
          }

          const template = templatesById.get(rule.template_id) ?? null;
          if (!template) {
            runFailedCount += 1;
            failedCount += 1;
            continue;
          }

          if (appointmentRules.includes(rule)) {
            for (const appointment of filteredAppointments) {
              const payloadStatus =
                rule.payload &&
                typeof rule.payload === 'object' &&
                !Array.isArray(rule.payload)
                  ? (rule.payload.status as string | undefined)
                  : undefined;
              const payloadAppointmentType =
                rule.payload &&
                typeof rule.payload === 'object' &&
                !Array.isArray(rule.payload)
                  ? (rule.payload.appointmentType as string | undefined)
                  : undefined;

              if (payloadStatus && appointment.status !== payloadStatus) {
                continue;
              }

              if (
                rule.trigger_type === 'trial_reminder' &&
                appointment.appointment_type !== 'trial'
              ) {
                continue;
              }

              if (
                payloadAppointmentType &&
                appointment.appointment_type !== payloadAppointmentType
              ) {
                continue;
              }

              const baseTime =
                rule.trigger_type === 'appointment_confirmation'
                  ? appointment.created_at
                  : appointment.starts_at;
              const scheduledFor = addMinutes(baseTime, rule.event_offset_minutes);
              if (!isDue(scheduledFor, now)) {
                continue;
              }

              const idempotencyKey = `${rule.id}:appointment:${appointment.id}:${scheduledFor}`;
              const notificationLog = await createNotificationLog(service, {
                professionalId: professional.id,
                clientId: appointment.client_id,
                eventId: appointment.event_id ?? undefined,
                templateId: rule.template_id ?? undefined,
                automationRuleId: rule.id,
                executionKind: rule.trigger_type,
                scheduledFor,
                idempotencyKey,
                metadata: {
                  appointmentId: appointment.id,
                  dispatchRunId: dispatchRun.id,
                  clientId: appointment.client_id,
                },
              });

              if (!notificationLog) {
                runSkippedCount += 1;
                skippedCount += 1;
                continue;
              }

              notificationLogIds.push(notificationLog.id);

              try {
                const client = await getClientById(
                  service,
                  professional.id,
                  appointment.client_id,
                );

                if (rule.requires_opt_in) {
                  const optIn = await findOptIn(service, professional.id, client.id);
                  if (!optIn || optIn.status !== 'opted_in') {
                    await updateNotificationLog(service, notificationLog.id, {
                      status: 'skipped',
                      processedAt: new Date().toISOString(),
                      errorMessage: 'opt_in_required',
                    });
                    runSkippedCount += 1;
                    skippedCount += 1;
                    continue;
                  }
                }

                const result = await sendPersistedMessage({
                  service,
                  professional,
                  client,
                  template,
                  parameters: buildParameters({
                    client,
                    professional,
                    appointment,
                  }),
                  eventId: appointment.event_id ?? undefined,
                  source: 'automation',
                  metadata: {
                    automationRuleId: rule.id,
                    appointmentId: appointment.id,
                    dispatchRunId: dispatchRun.id,
                  },
                });

                await updateNotificationLog(service, notificationLog.id, {
                  status: 'processed',
                  processedAt: new Date().toISOString(),
                  messageId: result.message.id,
                  conversationId: result.conversation.id,
                });
                runProcessedCount += 1;
                processedCount += 1;
              } catch (reason) {
                await updateNotificationLog(service, notificationLog.id, {
                  status: 'failed',
                  processedAt: new Date().toISOString(),
                  errorMessage:
                    reason instanceof Error ? reason.message : String(reason),
                });
                await registerIntegrationLog(service, {
                  professionalId: professional.id,
                  clientId: appointment.client_id,
                  direction: 'system',
                  logType: 'automation',
                  eventKey: `automation-failed:${idempotencyKey}`,
                  status: 'failed',
                  errorMessage:
                    reason instanceof Error ? reason.message : String(reason),
                  payload: {
                    dispatchRunId: dispatchRun.id,
                    triggerSource,
                    automationRuleId: rule.id,
                  },
                });
                runFailedCount += 1;
                failedCount += 1;
              }
            }

            continue;
          }

          for (const event of events) {
            const payloadStatus =
              rule.payload &&
              typeof rule.payload === 'object' &&
              !Array.isArray(rule.payload)
                ? (rule.payload.status as string | undefined)
                : undefined;

            if (payloadStatus && event.status !== payloadStatus) {
              continue;
            }

            const scheduledFor = addMinutes(event.event_date, rule.event_offset_minutes);
            if (!isDue(scheduledFor, now)) {
              continue;
            }

            const idempotencyKey = `${rule.id}:event:${event.id}:${scheduledFor}`;
            const notificationLog = await createNotificationLog(service, {
              professionalId: professional.id,
              clientId: event.client_id,
              eventId: event.id,
              templateId: rule.template_id ?? undefined,
              automationRuleId: rule.id,
              executionKind: rule.trigger_type,
              scheduledFor,
              idempotencyKey,
              metadata: {
                eventId: event.id,
                dispatchRunId: dispatchRun.id,
                clientId: event.client_id,
              },
            });

            if (!notificationLog) {
              runSkippedCount += 1;
              skippedCount += 1;
              continue;
            }

            notificationLogIds.push(notificationLog.id);

            try {
              const client = await getClientById(
                service,
                professional.id,
                event.client_id,
              );

              if (rule.requires_opt_in) {
                const optIn = await findOptIn(service, professional.id, client.id);
                if (!optIn || optIn.status !== 'opted_in') {
                  await updateNotificationLog(service, notificationLog.id, {
                    status: 'skipped',
                    processedAt: new Date().toISOString(),
                    errorMessage: 'opt_in_required',
                  });
                  runSkippedCount += 1;
                  skippedCount += 1;
                  continue;
                }
              }

              const result = await sendPersistedMessage({
                service,
                professional,
                client,
                template,
                parameters: buildParameters({
                  client,
                  professional,
                  event,
                }),
                eventId: event.id,
                source: 'automation',
                metadata: {
                  automationRuleId: rule.id,
                  eventId: event.id,
                  dispatchRunId: dispatchRun.id,
                },
              });

              await updateNotificationLog(service, notificationLog.id, {
                status: 'processed',
                processedAt: new Date().toISOString(),
                messageId: result.message.id,
                conversationId: result.conversation.id,
              });
              runProcessedCount += 1;
              processedCount += 1;
            } catch (reason) {
              await updateNotificationLog(service, notificationLog.id, {
                status: 'failed',
                processedAt: new Date().toISOString(),
                errorMessage:
                  reason instanceof Error ? reason.message : String(reason),
              });
              await registerIntegrationLog(service, {
                professionalId: professional.id,
                clientId: event.client_id,
                direction: 'system',
                logType: 'automation',
                eventKey: `automation-failed:${idempotencyKey}`,
                status: 'failed',
                errorMessage:
                  reason instanceof Error ? reason.message : String(reason),
                payload: {
                  dispatchRunId: dispatchRun.id,
                  triggerSource,
                  automationRuleId: rule.id,
                },
              });
              runFailedCount += 1;
              failedCount += 1;
            }
          }
        }

        await updateDispatchRun(service, dispatchRun.id, {
          status:
            runFailedCount > 0 && runProcessedCount > 0
              ? 'partial'
              : runFailedCount > 0
                ? 'failed'
                : 'processed',
          processedCount: runProcessedCount,
          skippedCount: runSkippedCount,
          failedCount: runFailedCount,
        });
        await registerIntegrationLog(service, {
          professionalId: professional.id,
          clientId: requestedClientId,
          direction: 'system',
          logType: 'scheduler',
          eventKey: `scheduler:${executionKey}:completed`,
          status: runFailedCount > 0 && runProcessedCount === 0 ? 'failed' : 'processed',
          response: {
            dispatchRunId: dispatchRun.id,
            processedCount: runProcessedCount,
            skippedCount: runSkippedCount,
            failedCount: runFailedCount,
            triggerSource,
          },
        });
        await captureEdgeMessage('automation-dispatch-finished', {
          function: 'automation-dispatch',
          professionalId: professional.id,
          clientId: requestedClientId,
          dispatchRunId: dispatchRun.id,
          triggerSource,
          processedCount: runProcessedCount,
          skippedCount: runSkippedCount,
          failedCount: runFailedCount,
        });
      } catch (reason) {
        await updateDispatchRun(service, dispatchRun.id, {
          status: 'failed',
          processedCount: runProcessedCount,
          skippedCount: runSkippedCount,
          failedCount: runFailedCount + 1,
          errorMessage: reason instanceof Error ? reason.message : String(reason),
        });
        await registerIntegrationLog(service, {
          professionalId: professional.id,
          clientId: requestedClientId,
          direction: 'system',
          logType: 'scheduler',
          eventKey: `scheduler:${executionKey}:failed`,
          status: 'failed',
          errorMessage: reason instanceof Error ? reason.message : String(reason),
          payload: {
            dispatchRunId: dispatchRun.id,
            triggerSource,
          },
        });
        await captureEdgeError(reason, {
          function: 'automation-dispatch',
          professionalId: professional.id,
          clientId: requestedClientId,
          dispatchRunId: dispatchRun.id,
          triggerSource,
        });
        failedCount += 1;
      }
    }

    return jsonResponse({
      processedCount,
      skippedCount,
      failedCount,
      notificationLogIds,
      dispatchRunIds,
      triggerSource,
    });
  } catch (reason) {
    if (reason instanceof Response) {
      return reason;
    }

    console.error('[aura-automation-dispatch]', reason);
    await captureEdgeError(reason, {
      function: 'automation-dispatch',
      clientId: requestedClientId,
      triggerSource,
    });
    return jsonResponse(
      {
        error:
          reason instanceof Error
            ? reason.message
            : 'Unexpected automation error.',
      },
      400,
    );
  }
});
