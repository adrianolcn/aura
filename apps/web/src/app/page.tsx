import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null;

  redirect(user ? '/dashboard' : '/login');
}
