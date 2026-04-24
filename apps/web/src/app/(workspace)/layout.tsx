import type { PropsWithChildren } from 'react';

import { redirect } from 'next/navigation';

import { WorkspaceShell } from '@/components/workspace-shell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function WorkspaceLayout({ children }: PropsWithChildren) {
  const supabase = await createServerSupabaseClient();
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null;

  if (supabase && !user) {
    redirect('/login');
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
