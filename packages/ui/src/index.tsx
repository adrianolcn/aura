import type {
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from 'react';

function cn(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

export function AppShell({
  children,
  navigation,
  sidebarFooter,
  brandTitle = 'Beauty CRM',
  brandDescription = 'Operação diária para maquiadoras e penteadistas com foco em relacionamento, agenda e contratos.',
}: PropsWithChildren<{
  navigation: Array<{ href: string; label: string; active?: boolean }>;
  sidebarFooter?: ReactNode;
  brandTitle?: string;
  brandDescription?: string;
}>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.16),_transparent_35%),linear-gradient(180deg,_#fffaf7_0%,_#fff_100%)] text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 md:flex-row md:px-6">
        <aside className="mb-4 rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_24px_80px_rgba(148,74,24,0.08)] backdrop-blur md:mb-0 md:w-72 md:p-6">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-orange-500">AURA</p>
            <h1 className="mt-2 font-serif text-3xl text-stone-950">{brandTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {brandDescription}
            </p>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-2xl px-4 py-3 text-sm font-medium transition',
                  item.active
                    ? 'bg-stone-950 text-white shadow-lg'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950',
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {sidebarFooter ? (
            <div className="mt-8">{sidebarFooter}</div>
          ) : (
            <div className="mt-8 rounded-3xl bg-stone-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-300">MVP</p>
              <p className="mt-3 text-sm leading-6 text-stone-200">
                Supabase pronto para auth, storage, realtime e futura integração com WhatsApp Cloud API.
              </p>
            </div>
          )}
        </aside>

        <main className="flex-1 md:pl-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  ...props
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'mb-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(148,74,24,0.08)] backdrop-blur',
        props.className,
      )}
    >
      <p className="text-xs uppercase tracking-[0.35em] text-cyan-700">{eyebrow}</p>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-serif text-4xl text-stone-950">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-stone-200 bg-white/90 p-5 shadow-[0_18px_45px_rgba(28,25,23,0.06)]">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-stone-950">{value}</p>
      <p className="mt-2 text-sm text-stone-600">{helper}</p>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  ...props
}: PropsWithChildren<{ title: string; description?: string } & HTMLAttributes<HTMLElement>>) {
  return (
    <section
      {...props}
      className={cn(
        'rounded-[1.75rem] border border-stone-200 bg-white/90 p-5 shadow-[0_18px_45px_rgba(28,25,23,0.06)]',
        props.className,
      )}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
        {description ? <p className="mt-1 text-sm text-stone-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' | 'info' }>) {
  const classes = {
    neutral: 'bg-stone-100 text-stone-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-orange-100 text-orange-700',
    info: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', classes[tone])}>
      {children}
    </span>
  );
}

export function Button({
  href,
  children,
  tone = 'primary',
}: PropsWithChildren<{ href: string; tone?: 'primary' | 'secondary' }>) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition',
        tone === 'primary'
          ? 'bg-stone-950 text-white hover:bg-stone-800'
          : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100',
      )}
    >
      {children}
    </a>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
      <p className="font-semibold text-stone-900">{title}</p>
      <p className="mt-2 leading-6">{description}</p>
    </div>
  );
}
