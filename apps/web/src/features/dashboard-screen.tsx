'use client';

import { formatCurrency, formatDateTime, useDashboardSummary } from '@aura/core';
import { Badge, Button, PageHeader, SectionCard, StatCard } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';
import { ErrorBlock, LoadingBlock } from '@/components/resource-state';

export function DashboardScreen() {
  const auth = useAuth();
  const { data, loading, error } = useDashboardSummary(auth.client);

  if (auth.loading || loading) {
    return <LoadingBlock title="Dashboard do negócio" />;
  }

  if (error || !data) {
    return <ErrorBlock message={error ?? 'Sem dados para o dashboard.'} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="AURA em movimento"
        description="Visão rápida do pipeline comercial, agenda da semana e clientes com maior prioridade operacional."
        actions={
          <>
            <Button href="/clients">Novo cliente</Button>
            <Button href="/agenda" tone="secondary">
              Ver agenda
            </Button>
          </>
        }
      />

      {data?.professional ? (
        <div className="rounded-[1.75rem] border border-stone-200 bg-white/90 p-5 text-sm text-stone-600 shadow-[0_18px_45px_rgba(28,25,23,0.06)]">
          Operando como <span className="font-semibold text-stone-950">{data.professional.businessName}</span> • tenant{' '}
          <span className="font-mono text-xs">{data.professional.id}</span>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clientes ativos"
          value={String(data.activeClients)}
          helper="Base viva com histórico por cliente e eventos."
        />
        <StatCard
          label="Eventos fechados"
          value={String(data.bookedEvents)}
          helper="Eventos já convertidos para operação."
        />
        <StatCard
          label="Orçamentos pendentes"
          value={String(data.pendingBudgets)}
          helper="Propostas que ainda precisam de follow-up."
        />
        <StatCard
          label="Pipeline"
          value={formatCurrency(data.revenuePipeline)}
          helper="Receita potencial em negociação."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <SectionCard
          title="Próximos compromissos"
          description="Agenda crítica para o próximo ciclo operacional."
        >
          <div className="space-y-3">
            {data.nextAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-col gap-3 rounded-[1.25rem] border border-stone-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-stone-950">{appointment.title}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatDateTime(appointment.startsAt)} • {appointment.location ?? 'Sem local'}
                  </p>
                </div>
                <Badge tone={appointment.status === 'confirmed' ? 'success' : 'info'}>
                  {appointment.status}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Clientes quentes"
          description="Quem merece resposta rápida, proposta refinada ou check-in manual."
        >
          <div className="space-y-3">
            {data.topClients.map((client) => (
              <a
                key={client.id}
                href={`/clients/${client.id}`}
                className="block rounded-[1.25rem] border border-stone-200 p-4 transition hover:border-orange-200 hover:bg-orange-50/60"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-stone-950">{client.fullName}</p>
                    <p className="mt-1 text-sm text-stone-600">{client.phone}</p>
                  </div>
                  <Badge tone="warning">Score {client.priorityScore}</Badge>
                </div>
              </a>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
