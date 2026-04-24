import type { PropsWithChildren } from 'react';

import { EmptyState, SectionCard } from '@aura/ui';

export function LoadingBlock({ title }: { title: string }) {
  return (
    <SectionCard title={title} description="Carregando dados do workspace.">
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[1.25rem] bg-stone-100"
          />
        ))}
      </div>
    </SectionCard>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <EmptyState
      title="Não foi possível carregar os dados"
      description={message}
    />
  );
}

export function Panel({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <SectionCard title={title} description={description}>
      {children}
    </SectionCard>
  );
}
