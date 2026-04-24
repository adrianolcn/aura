'use client';

import { useDashboardSummary, useI18n } from '@aura/core';
import { Badge, Button, PageHeader, SectionCard, StatCard } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';
import { ErrorBlock, LoadingBlock } from '@/components/resource-state';

export function DashboardScreen() {
  const auth = useAuth();
  const { t, formatCurrency, formatDateTime, appointmentStatusLabel } = useI18n();
  const { data, loading, error } = useDashboardSummary(auth.client);

  if (auth.loading || loading) {
    return <LoadingBlock title={t('nav.dashboard')} />;
  }

  if (error || !data) {
    return <ErrorBlock message={error ?? t('dashboard.pipelineHelper')} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <>
            <Button href="/clients">{t('dashboard.newClient')}</Button>
            <Button href="/agenda" tone="secondary">
              {t('dashboard.viewAgenda')}
            </Button>
          </>
        }
      />

      {data?.professional ? (
        <div className="rounded-[1.75rem] border border-stone-200 bg-white/90 p-5 text-sm text-stone-600 shadow-[0_18px_45px_rgba(28,25,23,0.06)]">
          {t('dashboard.actingAs', {
            businessName: data.professional.businessName,
            tenantId: data.professional.id,
          })}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard.activeClients')}
          value={String(data.activeClients)}
          helper={t('dashboard.activeClientsHelper')}
        />
        <StatCard
          label={t('dashboard.bookedEvents')}
          value={String(data.bookedEvents)}
          helper={t('dashboard.bookedEventsHelper')}
        />
        <StatCard
          label={t('dashboard.pendingBudgets')}
          value={String(data.pendingBudgets)}
          helper={t('dashboard.pendingBudgetsHelper')}
        />
        <StatCard
          label={t('dashboard.pipeline')}
          value={formatCurrency(data.revenuePipeline)}
          helper={t('dashboard.pipelineHelper')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <SectionCard
          title={t('dashboard.nextAppointments')}
          description={t('dashboard.nextAppointmentsDescription')}
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
                    {formatDateTime(appointment.startsAt)} • {appointment.location ?? t('common.noLocation')}
                  </p>
                </div>
                <Badge tone={appointment.status === 'confirmed' ? 'success' : 'info'}>
                  {appointmentStatusLabel(appointment.status)}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={t('dashboard.topClients')}
          description={t('dashboard.topClientsDescription')}
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
