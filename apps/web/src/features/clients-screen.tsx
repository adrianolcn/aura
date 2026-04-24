'use client';

import { useState, type ReactNode } from 'react';

import { formatPhone, toUserMessage, upsertClient, useClients, useI18n } from '@aura/core';
import { clientInputSchema, type ClientInput } from '@aura/types';
import { Badge, Button, EmptyState, PageHeader, SectionCard } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';
import { ErrorBlock, LoadingBlock } from '@/components/resource-state';

const initialForm: ClientInput = {
  fullName: '',
  phone: '',
  email: '',
  city: '',
  instagramHandle: '',
  lifecycleStage: 'lead',
  priorityScore: 50,
  notes: '',
};

export function ClientsScreen() {
  const auth = useAuth();
  const { t, formatDate, lifecycleStageLabel } = useI18n();
  const [search, setSearch] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState<'all' | ClientInput['lifecycleStage']>('all');
  const [orderBy, setOrderBy] = useState<'updatedAt' | 'createdAt' | 'priorityScore'>('updatedAt');
  const { data, loading, error, reload } = useClients(auth.client, {
    search: search || undefined,
    lifecycleStage: lifecycleStage === 'all' ? undefined : lifecycleStage,
    orderBy,
    orderDirection: orderBy === 'priorityScore' ? 'desc' : 'desc',
  });
  const [form, setForm] = useState<ClientInput>(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (auth.loading || loading) {
    return <LoadingBlock title={t('nav.clients')} />;
  }

  if (error || !data) {
    return <ErrorBlock message={error ?? t('clients.emptyDescription')} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('clients.eyebrow')}
        title={t('clients.title')}
        description={t('clients.description')}
        actions={<Button href="/dashboard">{t('common.backToDashboard')}</Button>}
      />

      <SectionCard
        title={t('clients.new')}
        description={t('clients.newDescription')}
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!auth.client) {
              return;
            }

            setSaving(true);
            setFormError(null);
            setSuccessMessage(null);

            try {
              const payload = clientInputSchema.parse(form);
              await upsertClient(auth.client, payload);
              setForm(initialForm);
              setSuccessMessage(t('clients.saved'));
              reload();
            } catch (reason) {
              setFormError(toUserMessage(reason, 'Não foi possível salvar a cliente.'));
            } finally {
              setSaving(false);
            }
          }}
        >
          <Field label={t('clients.fullName')}>
            <input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label={t('auth.phone')}>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label={t('auth.email')}>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label={t('clients.city')}>
            <input
              value={form.city ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label={t('clients.instagram')}>
            <input
              value={form.instagramHandle ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, instagramHandle: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label={t('clients.lifecycleStage')}>
            <select
              value={form.lifecycleStage}
              onChange={(event) =>
                setForm((current) => ({ ...current, lifecycleStage: event.target.value as ClientInput['lifecycleStage'] }))
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
              value={form.priorityScore}
              onChange={(event) =>
                setForm((current) => ({ ...current, priorityScore: Number(event.target.value || 0) }))
              }
              className={inputClassName}
            />
          </Field>
          <Field label={t('clients.notes')} className="md:col-span-2">
            <textarea
              value={form.notes ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className={`${inputClassName} min-h-28`}
            />
          </Field>

          {formError ? (
            <div className="md:col-span-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
          {successMessage ? (
            <div className="md:col-span-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {saving ? t('common.processing') : t('clients.save')}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={t('clients.pipelineTitle')}
        description={t('clients.pipelineDescription')}
      >
        <div className="mb-4 grid gap-3 md:grid-cols-[1.4fr,0.9fr,0.9fr]">
          <Field label={t('clients.search')}>
            <input
              data-testid="clients-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={inputClassName}
              placeholder={t('clients.searchPlaceholder')}
            />
          </Field>
          <Field label={t('clients.lifecycleStage')}>
            <select
              value={lifecycleStage}
              onChange={(event) =>
                setLifecycleStage(event.target.value as 'all' | ClientInput['lifecycleStage'])
              }
              className={inputClassName}
            >
              <option value="all">{t('common.all')}</option>
              {['lead', 'qualified', 'proposal', 'confirmed', 'archived'].map((stage) => (
                <option key={stage} value={stage}>
                  {lifecycleStageLabel(stage as ClientInput['lifecycleStage'])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('clients.orderBy')}>
            <select
              value={orderBy}
              onChange={(event) =>
                setOrderBy(event.target.value as 'updatedAt' | 'createdAt' | 'priorityScore')
              }
              className={inputClassName}
            >
              <option value="updatedAt">{t('clients.order.updatedAt')}</option>
              <option value="createdAt">{t('clients.order.createdAt')}</option>
              <option value="priorityScore">{t('clients.order.priorityScore')}</option>
            </select>
          </Field>
        </div>

        {!data.length ? (
          <EmptyState
            title={t('clients.emptyTitle')}
            description={t('clients.emptyDescription')}
          />
        ) : (
          <div className="overflow-hidden rounded-[1.25rem] border border-stone-200">
          <div className="hidden grid-cols-[1.3fr,1fr,0.8fr,0.9fr,0.7fr] gap-3 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 md:grid">
            <span>{t('clients.table.client')}</span>
            <span>{t('clients.table.contact')}</span>
            <span>{t('clients.table.stage')}</span>
            <span>{t('clients.table.score')}</span>
            <span>{t('clients.table.since')}</span>
          </div>

          <div className="divide-y divide-stone-200">
            {data.map((client) => (
              <a
                key={client.id}
                href={`/clients/${client.id}`}
                data-testid={`client-row-${client.id}`}
                className="grid gap-3 px-4 py-4 transition hover:bg-orange-50/50 md:grid-cols-[1.3fr,1fr,0.8fr,0.9fr,0.7fr] md:items-center"
              >
                <div>
                  <p className="font-semibold text-stone-950">{client.fullName}</p>
                  <p className="mt-1 text-sm text-stone-600">{client.city ?? t('common.notInformed')}</p>
                </div>
                <div className="text-sm text-stone-600">
                  <p>{formatPhone(client.phone)}</p>
                  <p className="mt-1">{client.email ?? t('common.noEmail')}</p>
                </div>
                <div>
                  <Badge tone={client.lifecycleStage === 'confirmed' ? 'success' : 'info'}>
                    {lifecycleStageLabel(client.lifecycleStage)}
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-stone-950">
                  {client.priorityScore}/100
                </div>
                <div className="text-sm text-stone-600">{formatDate(client.createdAt)}</div>
              </a>
            ))}
          </div>
          </div>
        )}
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

const inputClassName =
  'w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950';
