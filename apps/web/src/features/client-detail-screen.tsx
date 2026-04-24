'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import {
  buildRetryMessageInput,
  canSendSelectedTemplate,
  createSignedStorageUrl,
  createContract,
  dispatchAutomationRules,
  deleteAppointment,
  deleteBudget,
  deleteClient,
  deleteClientDocument,
  deleteClientMedia,
  deleteContract,
  deleteEvent,
  formatFileSize,
  sendClientMessage,
  toUserMessage,
  getConversationWindowState,
  upsertCommunicationOptIn,
  useSignedStorageUrl,
  useClientCommunicationSnapshot,
  updateContractStatus,
  uploadContractVersion,
  uploadClientAsset,
  upsertAppointment,
  upsertBudget,
  upsertClient,
  upsertEvent,
  useI18n,
  useClientWorkspaceSnapshot,
} from '@aura/core';
import type {
  AppointmentInput,
  BudgetInput,
  ClientInput,
  ClientEventInput,
  ContractInput,
} from '@aura/types';
import {
  appointmentInputSchema,
  budgetInputSchema,
  clientEventInputSchema,
  clientInputSchema,
  contractInputSchema,
} from '@aura/types';
import { Badge, Button, PageHeader, SectionCard, StatCard } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';
import { ErrorBlock, LoadingBlock } from '@/components/resource-state';
import { dateTimeLocalToIso, fileToUploadable, isoToDateTimeLocal } from '@/lib/upload';

const emptyBudgetItem = { description: '', quantity: 1, unitPrice: 0 };

export function ClientDetailScreen({ clientId }: { clientId: string }) {
  const auth = useAuth();
  const router = useRouter();
  const {
    t,
    formatDateTime,
    eventStatusLabel,
    appointmentStatusLabel,
    appointmentTypeLabel,
    budgetStatusLabel,
    contractStatusLabel,
    lifecycleStageLabel,
    messageStatusLabel,
  } = useI18n();
  const { data, loading, error, reload } = useClientWorkspaceSnapshot(auth.client, clientId, {
    refreshIntervalMs: 15000,
  });
  const {
    data: communicationData,
    loading: communicationLoading,
    error: communicationError,
    reload: reloadCommunication,
  } = useClientCommunicationSnapshot(auth.client, clientId, {
    refreshIntervalMs: 15000,
  });

  const [clientForm, setClientForm] = useState<ClientInput | null>(null);
  const [eventForm, setEventForm] = useState<Omit<ClientEventInput, 'clientId'> | null>(null);
  const [appointmentForm, setAppointmentForm] = useState<Omit<AppointmentInput, 'clientId'> | null>(null);
  const [budgetForm, setBudgetForm] = useState<Omit<BudgetInput, 'clientId'> | null>(null);
  const [contractForm, setContractForm] = useState<Omit<ContractInput, 'clientId'> | null>(null);
  const [uploadForm, setUploadForm] = useState<{ eventId?: string; caption: string }>({
    caption: '',
  });
  const [messageBody, setMessageBody] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateParameters, setTemplateParameters] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    setClientForm({
      fullName: data.client.fullName,
      phone: data.client.phone,
      email: data.client.email ?? '',
      city: data.client.city ?? '',
      instagramHandle: data.client.instagramHandle ?? '',
      lifecycleStage: data.client.lifecycleStage,
      priorityScore: data.client.priorityScore,
      notes: data.client.notes ?? '',
    });
    setEventForm({
      title: '',
      eventType: '',
      eventDate: new Date().toISOString(),
      location: '',
      status: 'lead',
      guestCount: undefined,
      notes: '',
    });
    setAppointmentForm({
      eventId: data.events[0]?.id,
      title: '',
      appointmentType: 'consultation',
      status: 'scheduled',
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      location: '',
      notes: '',
    });
    setBudgetForm({
      eventId: data.events[0]?.id ?? '',
      status: 'draft',
      currency: 'BRL',
      discountAmount: 0,
      validUntil: '',
      items: [emptyBudgetItem],
    });
    setContractForm({
      eventId: data.events[0]?.id ?? '',
      status: 'uploaded',
      signedAt: '',
    });
  }, [data]);

  useEffect(() => {
    if (!communicationData?.templates.length) {
      setSelectedTemplateId('');
      setTemplateParameters({});
      return;
    }

    if (
      selectedTemplateId &&
      communicationData.templates.some((template) => template.id === selectedTemplateId)
    ) {
      return;
    }

    const firstTemplate = communicationData.templates[0];
    setSelectedTemplateId(firstTemplate.id);
    const keys = firstTemplate.parameterSchema.length
      ? firstTemplate.parameterSchema
      : firstTemplate.variables;
    setTemplateParameters(
      Object.fromEntries(keys.map((key) => [key, ''])),
    );
  }, [communicationData?.templates, selectedTemplateId]);

  const eventOptions = useMemo(
    () =>
      data?.events.map((event) => ({
        id: event.id,
        label: `${event.title} • ${formatDateTime(event.eventDate)}`,
      })) ?? [],
    [data?.events, formatDateTime],
  );
  const selectedTemplate = useMemo(
    () => communicationData?.templates.find((template) => template.id === selectedTemplateId),
    [communicationData?.templates, selectedTemplateId],
  );
  const conversationWindow = useMemo(
    () => getConversationWindowState(communicationData?.conversation),
    [communicationData?.conversation],
  );
  const selectedTemplateAllowsSend = useMemo(
    () => canSendSelectedTemplate(selectedTemplate, communicationData?.optIn),
    [communicationData?.optIn, selectedTemplate],
  );
  const openStorageFile = useCallback(
    async (
      bucket: 'client-media' | 'contracts' | 'documents',
      path: string,
      fallbackMessage: string,
    ) => {
      if (!auth.client) {
        return;
      }

      const url = await createSignedStorageUrl(auth.client, bucket, path);
      window.open(url, '_blank', 'noopener,noreferrer');
      setStatusMessage(fallbackMessage);
    },
    [auth.client],
  );

  const runAction = async (label: string, task: () => Promise<void>) => {
    setBusyAction(label);
    setFormError(null);
    setStatusMessage(null);

    try {
      await task();
      setStatusMessage(t('clientDetail.success.saved'));
      await Promise.all([reload(), reloadCommunication()]);
    } catch (reason) {
      setFormError(toUserMessage(reason, t('clientDetail.error.actionFailed')));
    } finally {
      setBusyAction(null);
    }
  };

  if (auth.loading || loading || communicationLoading) {
    return <LoadingBlock title={t('nav.clients')} />;
  }

  if (
    error ||
    communicationError ||
    !data ||
    !communicationData ||
    !clientForm ||
    !eventForm ||
    !appointmentForm ||
    !budgetForm ||
    !contractForm
  ) {
    return <ErrorBlock message={error ?? communicationError ?? t('clientDetail.error.notFound')} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('nav.clients')}
        title={data.client.fullName}
        data-testid="client-detail-title"
        description={`${data.client.phone} • ${data.client.email ?? t('common.noEmail')} • ${data.client.city ?? t('common.notInformed')} • ${t('clientDetail.header.description', {
          score: String(data.client.priorityScore),
        })}`}
        actions={
          <>
            <Button href="/clients">{t('common.backToClients')}</Button>
            <Button href="/agenda" tone="secondary">
              {t('nav.agenda')}
            </Button>
          </>
        }
      />

      {formError ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('clientDetail.stats.eventsLabel')} value={String(data.events.length)} helper={t('clientDetail.stats.eventsHelper')} />
        <StatCard label={t('nav.budgets')} value={String(data.budgets.length)} helper={t('clientDetail.stats.budgetsHelper')} />
        <StatCard label={t('nav.contracts')} value={String(data.contracts.length)} helper={t('clientDetail.stats.contractsHelper')} />
        <StatCard label={t('clients.priorityScore')} value={`${data.score?.priorityScore ?? data.client.priorityScore}`} helper={t('clientDetail.stats.priorityHelper')} />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          t('clientDetail.summary.title'),
          t('clientDetail.timeline.title'),
          t('clientDetail.assets.title'),
          t('nav.budgets'),
          t('nav.agenda'),
          t('nav.contracts'),
          t('clientDetail.inbox.title'),
        ].map((section) => (
          <span key={section} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700">
            {section}
          </span>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <SectionCard title={t('clientDetail.summary.title')} description={t('clientDetail.summary.description')}>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!auth.client) {
                return;
              }

              await runAction('save-client', async () => {
                await upsertClient(auth.client!, clientInputSchema.parse(clientForm), data.client.id);
              });
            }}
          >
            <Field label={t('clients.fullName')}>
              <input
                value={clientForm.fullName}
                onChange={(event) => setClientForm((current) => ({ ...(current as ClientInput), fullName: event.target.value }))}
                className={inputClassName}
              />
            </Field>
            <Field label={t('clients.phone')}>
              <input
                value={clientForm.phone}
                onChange={(event) => setClientForm((current) => ({ ...(current as ClientInput), phone: event.target.value }))}
                className={inputClassName}
              />
            </Field>
            <Field label={t('clients.email')}>
              <input
                type="email"
                value={clientForm.email ?? ''}
                onChange={(event) => setClientForm((current) => ({ ...(current as ClientInput), email: event.target.value }))}
                className={inputClassName}
              />
            </Field>
            <Field label={t('clients.city')}>
              <input
                value={clientForm.city ?? ''}
                onChange={(event) => setClientForm((current) => ({ ...(current as ClientInput), city: event.target.value }))}
                className={inputClassName}
              />
            </Field>
            <Field label={t('clients.instagram')}>
              <input
                value={clientForm.instagramHandle ?? ''}
                onChange={(event) => setClientForm((current) => ({ ...(current as ClientInput), instagramHandle: event.target.value }))}
                className={inputClassName}
              />
            </Field>
            <Field label={t('clients.stage')}>
              <select
                value={clientForm.lifecycleStage}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...(current as ClientInput),
                    lifecycleStage: event.target.value as ClientInput['lifecycleStage'],
                  }))
                }
                className={inputClassName}
              >
                {['lead', 'qualified', 'proposal', 'confirmed', 'archived'].map((stage) => (
                  <option key={stage} value={stage}>
                    {lifecycleStageLabel(stage as ClientInput['lifecycleStage'])}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('clients.priorityScore')}>
              <input
                type="number"
                min={0}
                max={100}
                value={clientForm.priorityScore}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...(current as ClientInput),
                    priorityScore: Number(event.target.value || 0),
                  }))
                }
                className={inputClassName}
              />
            </Field>
            <Field label={t('clients.notes')} className="md:col-span-2">
              <textarea
                value={clientForm.notes ?? ''}
                onChange={(event) => setClientForm((current) => ({ ...(current as ClientInput), notes: event.target.value }))}
                className={`${inputClassName} min-h-28`}
              />
            </Field>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className={primaryButtonClassName} disabled={busyAction === 'save-client'}>
                {busyAction === 'save-client' ? t('common.processing') : t('common.save')}
              </button>
              <button
                type="button"
                className={dangerButtonClassName}
                disabled={busyAction === 'delete-client'}
                onClick={async () => {
                  if (!auth.client || !window.confirm(t('clientDetail.summary.deleteConfirm'))) {
                    return;
                  }

                  await runAction('delete-client', async () => {
                    await deleteClient(auth.client!, data.client.id);
                    router.replace('/clients');
                    router.refresh();
                  });
                }}
              >
                {busyAction === 'delete-client' ? t('common.processing') : t('common.delete')}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title={t('clientDetail.timeline.title')} description={t('clientDetail.timeline.description')}>
          <div className="space-y-3">
            {data.timeline.length ? (
              data.timeline.map((item) => (
                <div key={item.id} className="rounded-[1.25rem] border border-stone-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold capitalize text-stone-950">{item.title}</p>
                    <Badge tone="info">{item.kind}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{item.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.25em] text-stone-400">{formatDateTime(item.happenedAt)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-[1.25rem] border border-dashed border-stone-200 p-4 text-sm text-stone-500">
                {t('clientDetail.timeline.empty')}
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title={t('clientDetail.events.title')} description={t('clientDetail.events.description')}>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!auth.client) {
                return;
              }

              await runAction('create-event', async () => {
                await upsertEvent(auth.client!, clientEventInputSchema.parse({ ...eventForm, clientId }));
                setEventForm({
                  title: '',
                  eventType: '',
                  eventDate: new Date().toISOString(),
                  location: '',
                  status: 'lead',
                  guestCount: undefined,
                  notes: '',
                });
              });
            }}
          >
            <Field label={t('common.title')}>
              <input value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...(current as typeof eventForm), title: event.target.value }))} className={inputClassName} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t('common.type')}>
                <input value={eventForm.eventType} onChange={(event) => setEventForm((current) => ({ ...(current as typeof eventForm), eventType: event.target.value }))} className={inputClassName} />
              </Field>
              <Field label="Status">
                <select value={eventForm.status} onChange={(event) => setEventForm((current) => ({ ...(current as typeof eventForm), status: event.target.value as ClientEventInput['status'] }))} className={inputClassName}>
                  {['lead', 'quoted', 'booked', 'completed', 'cancelled'].map((status) => (
                    <option key={status} value={status}>{eventStatusLabel(status as ClientEventInput['status'])}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t('clients.eventDate')}>
              <input type="datetime-local" value={isoToDateTimeLocal(eventForm.eventDate)} onChange={(event) => setEventForm((current) => ({ ...(current as typeof eventForm), eventDate: dateTimeLocalToIso(event.target.value) }))} className={inputClassName} />
            </Field>
            <Field label={t('clients.location')}>
              <input value={eventForm.location ?? ''} onChange={(event) => setEventForm((current) => ({ ...(current as typeof eventForm), location: event.target.value }))} className={inputClassName} />
            </Field>
            <Field label={t('clients.guestCount')}>
              <input type="number" min={0} value={eventForm.guestCount ?? ''} onChange={(event) => setEventForm((current) => ({ ...(current as typeof eventForm), guestCount: event.target.value ? Number(event.target.value) : undefined }))} className={inputClassName} />
            </Field>
            <Field label={t('clients.notes')}>
              <textarea value={eventForm.notes ?? ''} onChange={(event) => setEventForm((current) => ({ ...(current as typeof eventForm), notes: event.target.value }))} className={`${inputClassName} min-h-24`} />
            </Field>
            <button type="submit" className={primaryButtonClassName} disabled={busyAction === 'create-event'}>
              {busyAction === 'create-event' ? t('common.processing') : t('clientDetail.events.create')}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {data.events.map((eventItem) => (
              <EditableEventCard
                key={eventItem.id}
                event={eventItem}
                busyAction={busyAction}
                onSave={async (input) => {
                  if (!auth.client) return;
                  await runAction(`update-event-${eventItem.id}`, async () => {
                    await upsertEvent(auth.client!, clientEventInputSchema.parse({ ...input, clientId }), eventItem.id);
                  });
                }}
                onDelete={async () => {
                  if (!auth.client) return;
                  await runAction(`delete-event-${eventItem.id}`, async () => {
                    await deleteEvent(auth.client!, eventItem.id);
                  });
                }}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('clientDetail.assets.title')} description={t('clientDetail.assets.description')}>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const fileInput = form.elements.namedItem('asset') as HTMLInputElement | null;
              const file = fileInput?.files?.[0];

              if (!auth.client || !file) {
                setFormError(t('clientDetail.assets.selectFile'));
                return;
              }

              await runAction('upload-asset', async () => {
                await uploadClientAsset(
                  auth.client!,
                  {
                    clientId,
                    eventId: uploadForm.eventId || undefined,
                    caption: uploadForm.caption || undefined,
                  },
                  await fileToUploadable(file),
                );

                setUploadForm({ eventId: uploadForm.eventId, caption: '' });
                form.reset();
              });
            }}
          >
            <Field label={t('common.linkEvent')}>
              <select
                value={uploadForm.eventId ?? ''}
                onChange={(event) => setUploadForm((current) => ({ ...current, eventId: event.target.value || undefined }))}
                className={inputClassName}
              >
                <option value="">{t('common.noSpecificEvent')}</option>
                {eventOptions.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('common.caption')}>
              <input value={uploadForm.caption} onChange={(event) => setUploadForm((current) => ({ ...current, caption: event.target.value }))} className={inputClassName} />
            </Field>
            <Field label={t('common.file')}>
              <input name="asset" type="file" accept="image/*,.pdf" className={inputClassName} />
            </Field>
            <button type="submit" className={primaryButtonClassName} disabled={busyAction === 'upload-asset'}>
              {busyAction === 'upload-asset' ? t('common.processing') : t('clientDetail.assets.upload')}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {data.media.map((media) => (
              <AssetCard
                key={media.id}
                client={auth.client}
                title={media.fileName}
                description={`${media.caption ?? t('clientDetail.assets.noCaption')} • ${media.mimeType} • ${formatFileSize(media.sizeBytes)}`}
                badge={media.mediaType}
                bucket="client-media"
                path={media.storagePath}
                previewImage
                onOpen={async () => {
                  await openStorageFile('client-media', media.storagePath, t('clientDetail.assets.openImage'));
                }}
                onDelete={async () => {
                  if (!auth.client) return;
                  await runAction(`delete-media-${media.id}`, async () => {
                    await deleteClientMedia(auth.client!, media);
                  });
                }}
              />
            ))}
            {data.documents
              .filter((document) => document.documentType !== 'contract')
              .map((document) => (
              <AssetCard
                key={document.id}
                client={auth.client}
                title={document.fileName}
                description={`${document.documentType} • ${document.mimeType} • ${formatFileSize(document.fileSizeBytes)}`}
                badge={document.documentType}
                bucket="documents"
                path={document.storagePath}
                onOpen={async () => {
                  await openStorageFile('documents', document.storagePath, t('clientDetail.assets.openFile'));
                }}
                onDelete={async () => {
                  if (!auth.client) return;
                  await runAction(`delete-document-${document.id}`, async () => {
                    await deleteClientDocument(auth.client!, document);
                  });
                }}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('clientDetail.agenda.title')} description={t('clientDetail.agenda.description')}>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!auth.client) return;

              await runAction('create-appointment', async () => {
                await upsertAppointment(
                  auth.client!,
                  appointmentInputSchema.parse({
                    ...appointmentForm,
                    clientId,
                    eventId: appointmentForm.eventId || undefined,
                  }),
                );
              });
            }}
          >
            <Field label={t('common.title')}>
              <input value={appointmentForm.title} onChange={(event) => setAppointmentForm((current) => ({ ...(current as typeof appointmentForm), title: event.target.value }))} className={inputClassName} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t('common.type')}>
                <select value={appointmentForm.appointmentType} onChange={(event) => setAppointmentForm((current) => ({ ...(current as typeof appointmentForm), appointmentType: event.target.value as AppointmentInput['appointmentType'] }))} className={inputClassName}>
                  {['consultation', 'trial', 'event', 'follow_up'].map((type) => (
                    <option key={type} value={type}>{appointmentTypeLabel(type as AppointmentInput['appointmentType'])}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('common.status')}>
                <select value={appointmentForm.status} onChange={(event) => setAppointmentForm((current) => ({ ...(current as typeof appointmentForm), status: event.target.value as AppointmentInput['status'] }))} className={inputClassName}>
                  {['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].map((status) => (
                    <option key={status} value={status}>{appointmentStatusLabel(status as AppointmentInput['status'])}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t('common.event')}>
              <select value={appointmentForm.eventId ?? ''} onChange={(event) => setAppointmentForm((current) => ({ ...(current as typeof appointmentForm), eventId: event.target.value || undefined }))} className={inputClassName}>
                <option value="">{t('common.noSpecificEvent')}</option>
                {eventOptions.map((event) => (
                  <option key={event.id} value={event.id}>{event.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t('common.start')}>
                <input type="datetime-local" value={isoToDateTimeLocal(appointmentForm.startsAt)} onChange={(event) => setAppointmentForm((current) => ({ ...(current as typeof appointmentForm), startsAt: dateTimeLocalToIso(event.target.value) }))} className={inputClassName} />
              </Field>
              <Field label={t('common.end')}>
                <input type="datetime-local" value={isoToDateTimeLocal(appointmentForm.endsAt)} onChange={(event) => setAppointmentForm((current) => ({ ...(current as typeof appointmentForm), endsAt: dateTimeLocalToIso(event.target.value) }))} className={inputClassName} />
              </Field>
            </div>
            <Field label={t('clients.location')}>
              <input value={appointmentForm.location ?? ''} onChange={(event) => setAppointmentForm((current) => ({ ...(current as typeof appointmentForm), location: event.target.value }))} className={inputClassName} />
            </Field>
            <Field label={t('clients.notes')}>
              <textarea value={appointmentForm.notes ?? ''} onChange={(event) => setAppointmentForm((current) => ({ ...(current as typeof appointmentForm), notes: event.target.value }))} className={`${inputClassName} min-h-24`} />
            </Field>
            <button type="submit" className={primaryButtonClassName} disabled={busyAction === 'create-appointment'}>
              {busyAction === 'create-appointment' ? t('common.processing') : t('clientDetail.agenda.create')}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {data.appointments.map((appointment) => (
              <div key={appointment.id} className="rounded-[1.25rem] border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-950">{appointment.title}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {formatDateTime(appointment.startsAt)} • {appointment.location ?? t('common.notInformed')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={appointment.status === 'confirmed' ? 'success' : 'info'}>{appointmentStatusLabel(appointment.status)}</Badge>
                    <button
                      type="button"
                      className={dangerTextButtonClassName}
                      onClick={async () => {
                        if (!auth.client) return;
                        await runAction(`delete-appointment-${appointment.id}`, async () => {
                          await deleteAppointment(auth.client!, appointment.id);
                        });
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('clientDetail.budgets.title')} description={t('clientDetail.budgets.description')}>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!auth.client) return;

              await runAction('create-budget', async () => {
                await upsertBudget(
                  auth.client!,
                  budgetInputSchema.parse({
                    ...budgetForm,
                    clientId,
                    validUntil: budgetForm.validUntil || undefined,
                  }),
                );
              });
            }}
          >
            <Field label={t('common.event')}>
              <select value={budgetForm.eventId} onChange={(event) => setBudgetForm((current) => ({ ...(current as typeof budgetForm), eventId: event.target.value }))} className={inputClassName}>
                <option value="">{t('common.select')}</option>
                {eventOptions.map((event) => (
                  <option key={event.id} value={event.id}>{event.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label={t('common.status')}>
                <select value={budgetForm.status} onChange={(event) => setBudgetForm((current) => ({ ...(current as typeof budgetForm), status: event.target.value as BudgetInput['status'] }))} className={inputClassName}>
                  {['draft', 'sent', 'approved', 'rejected', 'expired'].map((status) => (
                    <option key={status} value={status}>{budgetStatusLabel(status as BudgetInput['status'])}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('common.currency')}>
                <input value={budgetForm.currency} onChange={(event) => setBudgetForm((current) => ({ ...(current as typeof budgetForm), currency: event.target.value.toUpperCase() }))} className={inputClassName} />
              </Field>
              <Field label={t('common.discount')}>
                <input type="number" min={0} step="0.01" value={budgetForm.discountAmount} onChange={(event) => setBudgetForm((current) => ({ ...(current as typeof budgetForm), discountAmount: Number(event.target.value || 0) }))} className={inputClassName} />
              </Field>
            </div>
            <Field label={t('common.validUntil')}>
              <input type="datetime-local" value={budgetForm.validUntil ? isoToDateTimeLocal(budgetForm.validUntil) : ''} onChange={(event) => setBudgetForm((current) => ({ ...(current as typeof budgetForm), validUntil: event.target.value ? dateTimeLocalToIso(event.target.value) : '' }))} className={inputClassName} />
            </Field>
            <div className="space-y-3">
              {budgetForm.items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-[1.25rem] border border-stone-200 p-4 md:grid-cols-[1.4fr,0.6fr,0.7fr,auto]">
                  <input value={item.description} onChange={(event) => setBudgetForm((current) => ({ ...((current ?? budgetForm) as typeof budgetForm), items: (current ?? budgetForm).items.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: event.target.value } : entry) }))} placeholder={t('common.description')} className={inputClassName} />
                  <input type="number" min={1} step="0.1" value={item.quantity} onChange={(event) => setBudgetForm((current) => ({ ...((current ?? budgetForm) as typeof budgetForm), items: (current ?? budgetForm).items.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: Number(event.target.value || 1) } : entry) }))} placeholder={t('common.quantity')} className={inputClassName} />
                  <input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(event) => setBudgetForm((current) => ({ ...((current ?? budgetForm) as typeof budgetForm), items: (current ?? budgetForm).items.map((entry, entryIndex) => entryIndex === index ? { ...entry, unitPrice: Number(event.target.value || 0) } : entry) }))} placeholder={t('common.unitPrice')} className={inputClassName} />
                  <button type="button" className={secondaryButtonClassName} onClick={() => setBudgetForm((current) => ({ ...((current ?? budgetForm) as typeof budgetForm), items: (current ?? budgetForm).items.filter((_, entryIndex) => entryIndex !== index) }))}>
                    {t('common.delete')}
                  </button>
                </div>
              ))}
              <button type="button" className={secondaryButtonClassName} onClick={() => setBudgetForm((current) => ({ ...((current ?? budgetForm) as typeof budgetForm), items: [...(current ?? budgetForm).items, emptyBudgetItem] }))}>
                {t('common.addItem')}
              </button>
            </div>
            <button type="submit" className={primaryButtonClassName} disabled={busyAction === 'create-budget'}>
              {busyAction === 'create-budget' ? t('common.processing') : t('clientDetail.budgets.create')}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {data.budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budgetId={budget.id}
                total={budget.totalAmount}
                status={budget.status}
                validUntil={budget.validUntil}
                items={budget.items}
                busyAction={busyAction}
                onStatusChange={async (status) => {
                  if (!auth.client) return;
                  await runAction(`update-budget-${budget.id}`, async () => {
                    await upsertBudget(
                      auth.client!,
                      {
                        clientId,
                        eventId: budget.eventId,
                        currency: budget.currency,
                        discountAmount: budget.discountAmount,
                        validUntil: budget.validUntil,
                        status,
                        items: budget.items.map((item) => ({
                          description: item.description,
                          quantity: item.quantity,
                          unitPrice: item.unitPrice,
                          serviceId: item.serviceId,
                        })),
                      },
                      budget.id,
                    );
                  });
                }}
                onDelete={async () => {
                  if (!auth.client) return;
                  await runAction(`delete-budget-${budget.id}`, async () => {
                    await deleteBudget(auth.client!, budget.id);
                  });
                }}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('clientDetail.contracts.title')} description={t('clientDetail.contracts.description')}>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const fileInput = event.currentTarget.elements.namedItem('contractFile') as HTMLInputElement | null;
              const file = fileInput?.files?.[0];

              if (!auth.client || !file) {
                setFormError(t('clientDetail.contracts.selectPdf'));
                return;
              }

              await runAction('create-contract', async () => {
                await createContract(
                  auth.client!,
                  contractInputSchema.parse({
                    ...contractForm,
                    clientId,
                    eventId: contractForm.eventId,
                    signedAt: contractForm.signedAt || undefined,
                  }),
                  await fileToUploadable(file),
                );
                event.currentTarget.reset();
              });
            }}
          >
            <Field label={t('common.event')}>
              <select value={contractForm.eventId} onChange={(event) => setContractForm((current) => ({ ...(current as typeof contractForm), eventId: event.target.value }))} className={inputClassName}>
                <option value="">{t('common.select')}</option>
                {eventOptions.map((event) => (
                  <option key={event.id} value={event.id}>{event.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t('common.initialStatus')}>
                <select value={contractForm.status} onChange={(event) => setContractForm((current) => ({ ...(current as typeof contractForm), status: event.target.value as ContractInput['status'] }))} className={inputClassName}>
                  {['draft', 'uploaded', 'sent', 'signed', 'cancelled'].map((status) => (
                    <option key={status} value={status}>{contractStatusLabel(status as ContractInput['status'])}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('common.signedAt')}>
                <input type="datetime-local" value={contractForm.signedAt ? isoToDateTimeLocal(contractForm.signedAt) : ''} onChange={(event) => setContractForm((current) => ({ ...(current as typeof contractForm), signedAt: event.target.value ? dateTimeLocalToIso(event.target.value) : '' }))} className={inputClassName} />
              </Field>
            </div>
            <Field label={t('common.contractPdf')}>
              <input name="contractFile" type="file" accept="application/pdf,.pdf" className={inputClassName} />
            </Field>
            <button type="submit" className={primaryButtonClassName} disabled={busyAction === 'create-contract'}>
              {busyAction === 'create-contract' ? t('common.processing') : t('clientDetail.contracts.create')}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {data.contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                title={contract.version?.fileName ?? 'Contrato sem versão'}
                status={contract.status}
                signedAt={contract.signedAt}
                versions={contract.versions}
                busyAction={busyAction}
                onOpen={async () => {
                  if (!contract.version) {
                    setFormError(t('clientDetail.contracts.missingPdf'));
                    return;
                  }

                  await openStorageFile('contracts', contract.version.storagePath, t('clientDetail.contracts.openPdf'));
                }}
                onUploadVersion={async (file) => {
                  if (!auth.client) return;
                  await runAction(`upload-contract-version-${contract.id}`, async () => {
                    await uploadContractVersion(auth.client!, contract.id, await fileToUploadable(file));
                  });
                }}
                onUpdate={async (status) => {
                  if (!auth.client) return;
                  await runAction(`update-contract-${contract.id}`, async () => {
                    await updateContractStatus(auth.client!, contract.id, {
                      status,
                      signedAt: status === 'signed' ? new Date().toISOString() : undefined,
                    });
                  });
                }}
                onDelete={async () => {
                  if (!auth.client) return;
                  await runAction(`delete-contract-${contract.id}`, async () => {
                    await deleteContract(auth.client!, contract.id);
                  });
                }}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={t('clientDetail.inbox.title')}
        description={t('clientDetail.inbox.description')}
        data-testid="client-conversation"
      >
        <div className="grid gap-4 xl:grid-cols-[0.7fr,1.3fr]">
          <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-stone-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-950">{t('clientDetail.inbox.optInTitle')}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {communicationData.optIn
                      ? t('clientDetail.inbox.optInStatus', {
                          status: communicationData.optIn.status,
                          source: communicationData.optIn.source,
                        })
                      : t('clientDetail.inbox.optInEmpty')}
                  </p>
                </div>
                <Badge tone={communicationData.optIn?.status === 'opted_in' ? 'success' : 'warning'}>
                  {communicationData.optIn?.status ?? t('clientDetail.inbox.pending')}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-stone-600">
                {communicationData.optIn?.grantedAt
                  ? t('clientDetail.inbox.optInGrantedAt', {
                      value: formatDateTime(communicationData.optIn.grantedAt),
                    })
                  : t('clientDetail.inbox.optInHint')}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  data-testid="opt-in-button"
                  className={primaryButtonClassName}
                  disabled={busyAction === 'opt-in'}
                  onClick={async () => {
                    if (!auth.client) {
                      return;
                    }

                    await runAction('opt-in', async () => {
                      await upsertCommunicationOptIn(auth.client!, {
                        clientId,
                        channel: 'whatsapp',
                        status: 'opted_in',
                        source: 'manual',
                      });
                    });
                  }}
                >
                  {busyAction === 'opt-in' ? t('common.processing') : t('clientDetail.inbox.registerOptIn')}
                </button>
                <button
                  type="button"
                  data-testid="opt-out-button"
                  className={secondaryButtonClassName}
                  disabled={busyAction === 'opt-out'}
                  onClick={async () => {
                    if (!auth.client) {
                      return;
                    }

                    await runAction('opt-out', async () => {
                      await upsertCommunicationOptIn(auth.client!, {
                        clientId,
                        channel: 'whatsapp',
                        status: 'opted_out',
                        source: 'manual',
                      });
                    });
                  }}
                >
                  {busyAction === 'opt-out' ? t('common.processing') : t('clientDetail.inbox.revokeOptIn')}
                </button>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-stone-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-950">{t('clientDetail.inbox.templateTitle')}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {t('clientDetail.inbox.templateDescription')}
                  </p>
                </div>
                <Badge tone="info">
                  {t('clientDetail.inbox.templatesActive', {
                    count: String(communicationData.templates.length),
                  })}
                </Badge>
              </div>
              <div className="mt-4 space-y-3">
                <Field label={t('clientDetail.inbox.templateField')}>
                  <select
                    data-testid="template-select"
                    value={selectedTemplateId}
                    onChange={(event) => {
                      const nextTemplateId = event.target.value;
                      setSelectedTemplateId(nextTemplateId);
                      const template = communicationData.templates.find((item) => item.id === nextTemplateId);
                      const keys = template
                        ? template.parameterSchema.length
                          ? template.parameterSchema
                          : template.variables
                        : [];
                      setTemplateParameters(Object.fromEntries(keys.map((key) => [key, ''])));
                    }}
                    className={inputClassName}
                  >
                    {communicationData.templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {selectedTemplate ? (
                  <div className="rounded-2xl bg-stone-50 p-4">
                    <p className="text-sm font-semibold text-stone-900">
                      {selectedTemplate.externalTemplateName ?? t('clientDetail.inbox.mappingPending')}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{selectedTemplate.body}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-400">
                      {selectedTemplate.requiresOptIn
                        ? t('clientDetail.inbox.templateRequiresOptIn')
                        : t('clientDetail.inbox.templateNoOptIn')}
                    </p>
                  </div>
                ) : null}

                {(selectedTemplate?.parameterSchema.length
                  ? selectedTemplate.parameterSchema
                  : selectedTemplate?.variables ?? []
                ).map((key) => (
                  <Field key={key} label={key}>
                    <input
                      data-testid={`template-param-${key}`}
                      value={templateParameters[key] ?? ''}
                      onChange={(event) =>
                        setTemplateParameters((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </Field>
                ))}

                <button
                  type="button"
                  className={primaryButtonClassName}
                  data-testid="send-template-button"
                  disabled={
                    busyAction === 'send-template' ||
                    !selectedTemplateId ||
                    !selectedTemplateAllowsSend
                  }
                  onClick={async () => {
                    if (!auth.client || !selectedTemplateId || !selectedTemplateAllowsSend) {
                      return;
                    }

                    await runAction('send-template', async () => {
                      await sendClientMessage(auth.client!, {
                        clientId,
                        conversationId: communicationData.conversation?.id,
                        templateId: selectedTemplateId,
                        parameters: templateParameters,
                        eventId: data.events[0]?.id,
                      });
                    });
                  }}
                >
                  {busyAction === 'send-template' ? t('common.processing') : t('clientDetail.inbox.sendTemplate')}
                </button>
                {selectedTemplate && !selectedTemplateAllowsSend ? (
                  <p className="text-sm text-amber-700">
                    {t('clientDetail.inbox.templateBlocked')}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-stone-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-950">{t('clientDetail.inbox.automationTitle')}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {t('clientDetail.inbox.automationDescription')}
                  </p>
                </div>
                <Badge tone="info">
                  {t('clientDetail.inbox.automationLogs', {
                    count: String(communicationData.notificationLogs.length),
                  })}
                </Badge>
              </div>
              <button
                type="button"
                className={`${primaryButtonClassName} mt-4`}
                disabled={busyAction === 'dispatch-automation'}
                onClick={async () => {
                  if (!auth.client) {
                    return;
                  }

                  await runAction('dispatch-automation', async () => {
                    const result = await dispatchAutomationRules(auth.client!, { clientId });
                    setStatusMessage(
                      t('clientDetail.inbox.automationResult', {
                        processed: String(result.processedCount),
                        skipped: String(result.skippedCount),
                        failed: String(result.failedCount),
                      }),
                    );
                  });
                }}
              >
                {busyAction === 'dispatch-automation' ? t('common.processing') : t('clientDetail.inbox.runAutomations')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-stone-200 p-4">
              <p className="font-semibold text-stone-950">{t('clientDetail.inbox.replyTitle')}</p>
              <p className="mt-1 text-sm text-stone-600">
                {t('clientDetail.inbox.replyDescription')}
              </p>
              <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">
                  {conversationWindow.status === 'open'
                    ? t('clientDetail.inbox.windowOpen')
                    : conversationWindow.status === 'expired'
                      ? t('clientDetail.inbox.windowExpired')
                      : t('clientDetail.inbox.windowUnavailable')}
                </p>
                <p className="mt-2">{conversationWindow.helperText}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-400">
                  {t('common.automaticSync')}
                </p>
              </div>
              <Field label={t('common.message')} className="mt-4">
                <textarea
                  data-testid="conversation-textarea"
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  className={`${inputClassName} min-h-28`}
                  placeholder={
                    conversationWindow.canSendFreeText
                      ? t('clientDetail.inbox.replyPlaceholder')
                      : t('mobile.inboxBlocked')
                  }
                />
              </Field>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={primaryButtonClassName}
                  data-testid="send-text-button"
                  disabled={
                    busyAction === 'send-text' ||
                    !messageBody.trim() ||
                    !conversationWindow.canSendFreeText
                  }
                  onClick={async () => {
                    if (
                      !auth.client ||
                      !messageBody.trim() ||
                      !conversationWindow.canSendFreeText
                    ) {
                      return;
                    }

                    await runAction('send-text', async () => {
                      await sendClientMessage(auth.client!, {
                        clientId,
                        conversationId: communicationData.conversation?.id,
                        body: messageBody.trim(),
                        parameters: {},
                        eventId: data.events[0]?.id,
                      });
                      setMessageBody('');
                    });
                  }}
                >
                  {busyAction === 'send-text' ? t('common.processing') : t('clientDetail.inbox.sendReply')}
                </button>
              </div>
            </div>

            <div className="space-y-3" data-testid="conversation-thread">
              {communicationData.conversation?.messages.length ? (
                communicationData.conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-3xl rounded-[1.25rem] px-4 py-3 text-sm leading-6 ${
                      message.direction === 'outbound'
                        ? 'ml-auto bg-stone-950 text-white'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {message.messageType === 'template'
                          ? message.templateName ?? t('clientDetail.inbox.templateFallback')
                          : message.body}
                      </p>
                      <Badge tone={message.status === 'failed' ? 'warning' : message.status === 'read' ? 'success' : 'info'}>
                        {messageStatusLabel(message.status)}
                      </Badge>
                    </div>
                    {message.messageType === 'template' ? (
                      <p className="mt-2 text-sm opacity-80">{message.body}</p>
                    ) : null}
                    {message.errorMessage ? (
                      <p className="mt-2 text-sm text-rose-200">{message.errorMessage}</p>
                    ) : null}
                    {message.direction === 'outbound' && message.status === 'failed' ? (
                      <button
                        type="button"
                        className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200 transition hover:text-white"
                        disabled={busyAction === `retry-message-${message.id}`}
                        onClick={async () => {
                          if (!auth.client) {
                            return;
                          }

                          await runAction(`retry-message-${message.id}`, async () => {
                            await sendClientMessage(
                              auth.client!,
                              buildRetryMessageInput(clientId, message),
                            );
                          });
                        }}
                      >
                        {busyAction === `retry-message-${message.id}`
                          ? t('common.processing')
                          : t('common.retry')}
                      </button>
                    ) : null}
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] opacity-70">
                      {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-stone-300 p-6 text-sm text-stone-600">
                  {t('clientDetail.inbox.historyEmpty')}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-stone-200 p-4">
                <p className="font-semibold text-stone-950">{t('clientDetail.inbox.statusHistoryTitle')}</p>
                <div className="mt-4 space-y-3">
                  {communicationData.statusEvents.length ? (
                    communicationData.statusEvents.map((entry) => (
                      <div key={entry.id} className="rounded-2xl bg-stone-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-stone-900">{messageStatusLabel(entry.status)}</span>
                          <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
                            {formatDateTime(entry.occurredAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-stone-600">
                          {entry.externalMessageId ?? t('clientDetail.inbox.statusRecorded')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-stone-600">{t('clientDetail.inbox.statusHistoryEmpty')}</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-stone-200 p-4">
                <p className="font-semibold text-stone-950">{t('clientDetail.inbox.automationHistoryTitle')}</p>
                <div className="mt-4 space-y-3">
                  {communicationData.notificationLogs.length ? (
                    communicationData.notificationLogs.map((entry) => (
                      <div key={entry.id} className="rounded-2xl bg-stone-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-stone-900">{entry.executionKind}</span>
                          <Badge tone={entry.status === 'processed' ? 'success' : entry.status === 'failed' ? 'warning' : 'info'}>
                            {entry.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-stone-600">
                          {entry.errorMessage ??
                            t('clientDetail.inbox.automationScheduledFor', {
                              value: formatDateTime(entry.scheduledFor),
                            })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-stone-600">{t('clientDetail.inbox.automationHistoryEmpty')}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-stone-200 p-4">
              <p className="font-semibold text-stone-950">{t('clientDetail.inbox.schedulerTitle')}</p>
              <div className="mt-4 space-y-3">
                {communicationData.dispatchRuns.length ? (
                  communicationData.dispatchRuns.map((entry) => (
                    <div key={entry.id} className="rounded-2xl bg-stone-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-stone-900">
                          {entry.triggerSource}
                        </span>
                        <Badge
                          tone={
                            entry.status === 'processed'
                              ? 'success'
                              : entry.status === 'partial'
                                ? 'warning'
                                : 'info'
                          }
                        >
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-stone-600">
                        {t('clientDetail.inbox.schedulerSummary', {
                          processed: String(entry.processedCount),
                          skipped: String(entry.skippedCount),
                          failed: String(entry.failedCount),
                        })}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-400">
                        {formatDateTime(entry.startedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-600">
                    {t('clientDetail.inbox.schedulerEmpty')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm text-stone-600">{label}</span>
      {children}
    </label>
  );
}

function EditableEventCard({
  event,
  onSave,
  onDelete,
  busyAction,
}: {
  event: {
    id: string;
    title: string;
    eventType: string;
    eventDate: string;
    location?: string;
    status: ClientEventInput['status'];
    guestCount?: number;
    notes?: string;
  };
  onSave: (input: Omit<ClientEventInput, 'clientId'>) => Promise<void>;
  onDelete: () => Promise<void>;
  busyAction: string | null;
}) {
  const { formatDateTime, eventStatusLabel, t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Omit<ClientEventInput, 'clientId'>>({
    title: event.title,
    eventType: event.eventType,
    eventDate: event.eventDate,
    location: event.location ?? '',
    status: event.status,
    guestCount: event.guestCount,
    notes: event.notes ?? '',
  });

  return (
    <div className="rounded-[1.25rem] border border-stone-200 p-4">
      {editing ? (
        <div className="grid gap-3">
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClassName} />
          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.eventType} onChange={(event) => setForm((current) => ({ ...current, eventType: event.target.value }))} className={inputClassName} />
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ClientEventInput['status'] }))} className={inputClassName}>
              {['lead', 'quoted', 'booked', 'completed', 'cancelled'].map((status) => (
                <option key={status} value={status}>{eventStatusLabel(status as ClientEventInput['status'])}</option>
              ))}
            </select>
          </div>
          <input type="datetime-local" value={isoToDateTimeLocal(form.eventDate)} onChange={(event) => setForm((current) => ({ ...current, eventDate: dateTimeLocalToIso(event.target.value) }))} className={inputClassName} />
          <input value={form.location ?? ''} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className={inputClassName} />
          <textarea value={form.notes ?? ''} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={`${inputClassName} min-h-24`} />
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primaryButtonClassName} disabled={busyAction === `update-event-${event.id}`} onClick={async () => { await onSave(form); setEditing(false); }}>
              {busyAction === `update-event-${event.id}` ? t('common.processing') : t('common.save')}
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => setEditing(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-stone-950">{event.title}</p>
              <p className="mt-1 text-sm text-stone-600">
                {formatDateTime(event.eventDate)} • {event.location ?? t('common.noLocation')}
              </p>
            </div>
            <Badge tone={event.status === 'booked' ? 'success' : 'warning'}>{eventStatusLabel(event.status)}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-600">{event.notes ?? 'Sem observações.'}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={secondaryButtonClassName} onClick={() => setEditing(true)}>Editar</button>
            <button type="button" className={dangerTextButtonClassName} onClick={() => void onDelete()}>{t('common.delete')}</button>
          </div>
        </>
      )}
    </div>
  );
}

function AssetCard({
  client,
  title,
  description,
  badge,
  bucket,
  path,
  previewImage,
  onOpen,
  onDelete,
}: {
  client: ReturnType<typeof useAuth>['client'];
  title: string;
  description: string;
  badge: string;
  bucket: 'client-media' | 'contracts' | 'documents';
  path: string;
  previewImage?: boolean;
  onOpen: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { url } = useSignedStorageUrl(client, bucket, previewImage ? path : undefined);

  return (
    <div className="rounded-[1.25rem] border border-stone-200 p-4">
      {previewImage && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={title}
          className="mb-4 h-44 w-full rounded-[1rem] object-cover"
        />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-950">{title}</p>
          <p className="mt-1 text-sm text-stone-600">{description}</p>
        </div>
        <Badge tone="info">{badge}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <button type="button" className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-600" onClick={() => void onOpen()}>
          {t('common.openFile')}
        </button>
        <button type="button" className={dangerTextButtonClassName} onClick={() => void onDelete()}>
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}

function BudgetCard({
  budgetId,
  total,
  status,
  validUntil,
  items,
  onStatusChange,
  onDelete,
  busyAction,
}: {
  budgetId: string;
  total: number;
  status: BudgetInput['status'];
  validUntil?: string;
  items: Array<{ id: string; description: string; totalPrice: number }>;
  onStatusChange: (status: BudgetInput['status']) => Promise<void>;
  onDelete: () => Promise<void>;
  busyAction: string | null;
}) {
  const { formatCurrency, formatDate, budgetStatusLabel, t } = useI18n();
  return (
    <div className="rounded-[1.25rem] border border-stone-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-950">{formatCurrency(total)}</p>
          <p className="mt-1 text-sm text-stone-600">
            {items.length} itens • validade {validUntil ? formatDate(validUntil) : 'livre'}
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => void onStatusChange(event.target.value as BudgetInput['status'])}
          className={inputClassName}
        >
          {['draft', 'sent', 'approved', 'rejected', 'expired'].map((budgetStatus) => (
            <option key={budgetStatus} value={budgetStatus}>{budgetStatusLabel(budgetStatus as BudgetInput['status'])}</option>
          ))}
        </select>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm text-stone-600">
            <span>{item.description}</span>
            <span>{formatCurrency(item.totalPrice)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Badge tone={status === 'approved' ? 'success' : 'warning'}>{budgetStatusLabel(status)}</Badge>
        <button type="button" className={dangerTextButtonClassName} disabled={busyAction === `delete-budget-${budgetId}`} onClick={() => void onDelete()}>
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}

function ContractCard({
  title,
  status,
  signedAt,
  versions,
  busyAction,
  onOpen,
  onUploadVersion,
  onUpdate,
  onDelete,
}: {
  title: string;
  status: ContractInput['status'];
  signedAt?: string;
  versions: Array<{ id: string; fileName: string; versionNumber: number; uploadedAt: string }>;
  busyAction: string | null;
  onOpen: () => Promise<void>;
  onUploadVersion: (file: File) => Promise<void>;
  onUpdate: (status: ContractInput['status']) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { formatDate, contractStatusLabel, t } = useI18n();
  return (
    <div className="rounded-[1.25rem] border border-stone-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-950">{title}</p>
          <p className="mt-1 text-sm text-stone-600">
            {signedAt ? `Assinado em ${formatDate(signedAt)}` : 'Aguardando ação manual'}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {versions.length} vers{versions.length === 1 ? 'ão registrada' : 'ões registradas'}
          </p>
        </div>
        <select value={status} onChange={(event) => void onUpdate(event.target.value as ContractInput['status'])} className={inputClassName}>
          {['draft', 'uploaded', 'sent', 'signed', 'cancelled'].map((contractStatus) => (
            <option key={contractStatus} value={contractStatus}>{contractStatusLabel(contractStatus as ContractInput['status'])}</option>
          ))}
        </select>
      </div>
      {versions.length ? (
        <div className="mt-4 space-y-2 rounded-2xl bg-stone-50 p-3">
          {versions.map((version) => (
            <div key={version.id} className="flex items-center justify-between gap-3 text-sm text-stone-600">
              <span>
                V{version.versionNumber} • {version.fileName}
              </span>
              <span>{formatDate(version.uploadedAt)}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-3">
        <Badge tone={status === 'signed' ? 'success' : 'warning'}>{contractStatusLabel(status)}</Badge>
        <button type="button" className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-600" onClick={() => void onOpen()}>
          Abrir PDF
        </button>
        <label className="text-sm font-semibold text-stone-700">
          <span className="cursor-pointer transition hover:text-stone-950">Nova versão</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onUploadVersion(file);
                event.currentTarget.value = '';
              }
            }}
          />
        </label>
        <button type="button" className={dangerTextButtonClassName} onClick={() => void onDelete()}>
          {busyAction?.startsWith('delete-contract-') ? t('common.processing') : t('common.delete')}
        </button>
      </div>
    </div>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950';
const primaryButtonClassName =
  'rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60';
const secondaryButtonClassName =
  'rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100';
const dangerButtonClassName =
  'rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60';
const dangerTextButtonClassName =
  'text-sm font-semibold text-rose-600 transition hover:text-rose-500';
