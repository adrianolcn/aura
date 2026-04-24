import type { PropsWithChildren } from 'react';

import { useI18n } from '@aura/core';
import { EmptyState, SectionCard } from '@aura/ui';

export function LoadingBlock({ title }: { title: string }) {
  const { t } = useI18n();

  return (
    <SectionCard title={title} description={t('resource.loadingDescription')}>
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
  const { t } = useI18n();

  return (
    <EmptyState
      title={t('resource.errorTitle')}
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
