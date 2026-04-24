'use client';

import { useMemo, useState } from 'react';

import { formatDateTime, useAppointments } from '@aura/core';
import { Badge, PageHeader, SectionCard } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';
import { ErrorBlock, LoadingBlock } from '@/components/resource-state';

export function AgendaScreen() {
  const auth = useAuth();
  const [status, setStatus] = useState<'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'>('all');
  const [period, setPeriod] = useState<'today' | 'next7' | 'all'>('today');
  const range = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'all') {
      return {
        from: undefined,
        to: undefined,
      };
    }

    if (period === 'today') {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 1);
      return {
        from: startOfToday.toISOString(),
        to: end.toISOString(),
      };
    }

    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 7);
    return {
      from: startOfToday.toISOString(),
      to: end.toISOString(),
    };
  }, [period]);
  const { data, loading, error } = useAppointments(auth.client, {
    status: status === 'all' ? undefined : status,
    from: range.from,
    to: range.to,
    orderDirection: 'asc',
  });

  if (auth.loading || loading) {
    return <LoadingBlock title="Agenda" />;
  }

  if (error || !data) {
    return <ErrorBlock message={error ?? 'Sem agendamentos disponíveis.'} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Visão de compromissos"
        description="Base inicial para agenda, conflitos e evolução futura com confirmação automática e lembretes."
      />

      <SectionCard
        title="Agenda operacional"
        description="Próximos compromissos organizados por status e janela horária."
      >
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-stone-600">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | 'all'
                    | 'scheduled'
                    | 'confirmed'
                    | 'completed'
                    | 'cancelled'
                    | 'no_show',
                )
              }
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950"
            >
              <option value="all">Todos</option>
              {['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-stone-600">
            <span>Período</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as 'today' | 'next7' | 'all')}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950"
            >
              <option value="today">Hoje</option>
              <option value="next7">Próximos 7 dias</option>
              <option value="all">Tudo</option>
            </select>
          </label>
        </div>

        {!data.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
            Nenhum compromisso encontrado para o período e status selecionados.
          </div>
        ) : (
          <div className="space-y-3">
          {data.map((appointment) => (
            <div
              key={appointment.id}
              className="flex flex-col gap-3 rounded-[1.25rem] border border-stone-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-stone-950">{appointment.title}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {formatDateTime(appointment.startsAt)} até {formatDateTime(appointment.endsAt)}
                </p>
                <p className="mt-1 text-sm text-stone-500">{appointment.location ?? 'Sem local informado'}</p>
              </div>
              <Badge tone={appointment.status === 'confirmed' ? 'success' : 'info'}>
                {appointment.status}
              </Badge>
            </div>
          ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
