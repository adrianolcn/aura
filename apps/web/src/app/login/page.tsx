import { redirect } from 'next/navigation';

import { LoginScreen } from '@/features/login-screen';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null;

  if (user) {
    redirect('/dashboard');
  }

  return <LoginScreen />;
}
