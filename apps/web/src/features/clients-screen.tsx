'use client';

import { useState, type ReactNode } from 'react';

import { formatDate, formatPhone, toUserMessage, upsertClient, useClients } from '@aura/core';
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
    return <LoadingBlock title="Clientes" />;
  }

  if (error || !data) {
    return <ErrorBlock message={error ?? 'Sem clientes disponíveis.'} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Clientes e relacionamento"
        description="Cadastro centralizado com foco em telefone como identificador operacional, histórico por evento e priorização comercial."
        actions={<Button href="/dashboard">Voltar ao dashboard</Button>}
      />

      <SectionCard
        title="Nova cliente"
        description="Cadastro persistido no Supabase com segregação por profissional via RLS."
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
              setSuccessMessage('Cliente cadastrada com sucesso.');
              reload();
            } catch (reason) {
              setFormError(toUserMessage(reason, 'Não foi possível salvar a cliente.'));
            } finally {
              setSaving(false);
            }
          }}
        >
          <Field label="Nome completo">
            <input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label="Telefone">
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label="Cidade">
            <input
              value={form.city ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label="Instagram">
            <input
              value={form.instagramHandle ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, instagramHandle: event.target.value }))}
              className={inputClassName}
            />
          </Field>
          <Field label="Etapa">
            <select
              value={form.lifecycleStage}
              onChange={(event) =>
                setForm((current) => ({ ...current, lifecycleStage: event.target.value as ClientInput['lifecycleStage'] }))
              }
              className={inputClassName}
            >
              {['lead', 'qualified', 'proposal', 'confirmed', 'archived'].map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Score de prioridade">
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
          <Field label="Observações" className="md:col-span-2">
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
              {saving ? 'Salvando...' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Pipeline de clientes"
        description="Clientes persistidos com acesso ao detalhe operacional completo."
      >
        <div className="mb-4 grid gap-3 md:grid-cols-[1.4fr,0.9fr,0.9fr]">
          <Field label="Buscar por nome ou telefone">
            <input
              data-testid="clients-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={inputClassName}
              placeholder="Ex.: Ana ou 71 99999-0000"
            />
          </Field>
          <Field label="Etapa">
            <select
              value={lifecycleStage}
              onChange={(event) =>
                setLifecycleStage(event.target.value as 'all' | ClientInput['lifecycleStage'])
              }
              className={inputClassName}
            >
              <option value="all">Todas</option>
              {['lead', 'qualified', 'proposal', 'confirmed', 'archived'].map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ordenar por">
            <select
              value={orderBy}
              onChange={(event) =>
                setOrderBy(event.target.value as 'updatedAt' | 'createdAt' | 'priorityScore')
              }
              className={inputClassName}
            >
              <option value="updatedAt">Atualização recente</option>
              <option value="createdAt">Cadastro recente</option>
              <option value="priorityScore">Maior prioridade</option>
            </select>
          </Field>
        </div>

        {!data.length ? (
          <EmptyState
            title="Nenhuma cliente encontrada"
            description="Ajuste os filtros ou cadastre a primeira cliente para começar a operar o CRM."
          />
        ) : (
          <div className="overflow-hidden rounded-[1.25rem] border border-stone-200">
          <div className="hidden grid-cols-[1.3fr,1fr,0.8fr,0.9fr,0.7fr] gap-3 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 md:grid">
            <span>Cliente</span>
            <span>Contato</span>
            <span>Etapa</span>
            <span>Score</span>
            <span>Desde</span>
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
                  <p className="mt-1 text-sm text-stone-600">{client.city ?? 'Cidade não informada'}</p>
                </div>
                <div className="text-sm text-stone-600">
                  <p>{formatPhone(client.phone)}</p>
                  <p className="mt-1">{client.email ?? 'Sem email'}</p>
                </div>
                <div>
                  <Badge tone={client.lifecycleStage === 'confirmed' ? 'success' : 'info'}>
                    {client.lifecycleStage}
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
