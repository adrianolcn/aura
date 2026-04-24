import type {
  AuthResponse,
  AuthTokenResponsePassword,
} from '@supabase/supabase-js';

import type {
  AuthSignInInput,
  AuthSignUpInput,
  Professional,
} from '@aura/types';
import {
  authSignInSchema,
  authSignUpSchema,
} from '@aura/types';

import type {
  AuraSession,
  AuraSupabaseClient,
  AuraUser,
} from './supabase';

export type AuraAuthState = {
  session: AuraSession | null;
  user: AuraUser | null;
  professional: Professional | null;
};

function mapProfessional(row: Record<string, unknown>): Professional {
  return {
    id: String(row.id),
    authUserId: String(row.auth_user_id),
    fullName: String(row.full_name),
    businessName: String(row.business_name),
    phone: String(row.phone),
    whatsappPhone: String(row.whatsapp_phone),
    whatsappPhoneNumberId: row.whatsapp_phone_number_id
      ? String(row.whatsapp_phone_number_id)
      : undefined,
    whatsappBusinessAccountId: row.whatsapp_business_account_id
      ? String(row.whatsapp_business_account_id)
      : undefined,
    email: String(row.email),
    timezone: String(row.timezone ?? 'America/Sao_Paulo'),
    planTier: String(row.plan_tier ?? 'mvp'),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function signInWithPassword(
  client: AuraSupabaseClient,
  input: AuthSignInInput,
): Promise<AuthTokenResponsePassword> {
  const payload = authSignInSchema.parse(input);
  const response = await client.auth.signInWithPassword(payload);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response;
}

export async function signUpWithPassword(
  client: AuraSupabaseClient,
  input: AuthSignUpInput,
): Promise<AuthResponse> {
  const payload = authSignUpSchema.parse(input);
  const response = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        business_name: payload.businessName,
        phone: payload.phone,
        whatsapp_phone: payload.whatsappPhone ?? payload.phone,
      },
    },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response;
}

export async function signOut(client: AuraSupabaseClient) {
  const response = await client.auth.signOut();
  if (response.error) {
    throw new Error(response.error.message);
  }
}

export async function getAuthState(
  client: AuraSupabaseClient,
): Promise<AuraAuthState> {
  const sessionResponse = await client.auth.getSession();

  if (sessionResponse.error) {
    throw new Error(sessionResponse.error.message);
  }

  const session = sessionResponse.data.session;
  const user = session?.user ?? null;
  const professional = user ? await getCurrentProfessional(client) : null;

  return {
    session,
    user,
    professional,
  };
}

export async function getCurrentProfessional(
  client: AuraSupabaseClient,
): Promise<Professional | null> {
  const userResponse = await client.auth.getUser();
  if (userResponse.error) {
    throw new Error(userResponse.error.message);
  }

  const user = userResponse.data.user;
  if (!user) {
    return null;
  }

  const response = await client
    .from('professionals')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data ? mapProfessional(response.data as Record<string, unknown>) : null;
}
