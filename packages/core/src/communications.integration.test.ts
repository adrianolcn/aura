import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import type { TestGroup } from '../../../scripts/test-types.js';

import {
  getClientCommunicationSnapshot,
  upsertCommunicationOptIn,
} from './communications';
import type { AuraSupabaseClient } from './supabase';

type AnyClient = AuraSupabaseClient;

function readIntegrationEnv() {
  const supabaseUrl = process.env.AURA_INTEGRATION_SUPABASE_URL;
  const supabaseAnonKey = process.env.AURA_INTEGRATION_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.AURA_INTEGRATION_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    serviceRoleKey,
  };
}

async function createTenant(label: string) {
  const env = readIntegrationEnv();
  if (!env) {
    return null;
  }

  const service = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as unknown as AnyClient;
  const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as unknown as AnyClient;

  const email = `integration+${label}-${randomUUID()}@aura.test`;
  const password = 'Aura123456!';
  const userResponse = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Integration ${label}`,
      business_name: `AURA ${label}`,
      phone: '+55 71 90000-0000',
      whatsapp_phone: '+55 71 90000-0000',
    },
  });

  if (userResponse.error || !userResponse.data.user) {
    throw new Error(userResponse.error?.message ?? 'Could not create integration user.');
  }

  const professionalId = randomUUID();
  const clientId = randomUUID();

  const professionalResponse = await service.from('professionals').insert({
    id: professionalId,
    auth_user_id: userResponse.data.user.id,
    full_name: `Integration ${label}`,
    business_name: `AURA ${label}`,
    phone: '+55 71 90000-0000',
    whatsapp_phone: '+55 71 90000-0000',
    whatsapp_phone_number_id: `phone-${label}`,
    email,
    timezone: 'America/Bahia',
    plan_tier: 'mvp',
  });

  if (professionalResponse.error) {
    throw new Error(professionalResponse.error.message);
  }

  const clientResponse = await service.from('clients').insert({
    id: clientId,
    professional_id: professionalId,
    full_name: `Cliente ${label}`,
    phone: `+55 71 9${Math.floor(Math.random() * 89999999 + 10000000)}`,
    lifecycle_stage: 'lead',
    priority_score: 50,
  });

  if (clientResponse.error) {
    throw new Error(clientResponse.error.message);
  }

  const signInResponse = await anon.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResponse.error) {
    throw new Error(signInResponse.error.message);
  }

  return {
    service,
    anon,
    professionalId,
    clientId,
    userId: userResponse.data.user.id,
  };
}

export const testGroup: TestGroup = {
  name: 'communications integration',
  cases: [
    {
      name: 'upserts opt-in and reads the tenant-scoped communication snapshot',
      run: async () => {
        const tenant = await createTenant('snapshot');
        if (!tenant) {
          return;
        }

        const optIn = await upsertCommunicationOptIn(tenant.anon as never, {
          clientId: tenant.clientId,
          channel: 'whatsapp',
          status: 'opted_in',
          source: 'manual',
        });
        const snapshot = await getClientCommunicationSnapshot(
          tenant.anon as never,
          tenant.clientId,
        );

        assert.equal(optIn.status, 'opted_in');
        assert.equal(snapshot.optIn?.status, 'opted_in');
      },
    },
    {
      name: 'does not expose another tenant communication data through RLS',
      run: async () => {
        const leftTenant = await createTenant('left');
        const rightTenant = await createTenant('right');
        if (!leftTenant || !rightTenant) {
          return;
        }

        await leftTenant.service.from('communication_opt_ins').insert({
          professional_id: leftTenant.professionalId,
          client_id: leftTenant.clientId,
          channel: 'whatsapp',
          status: 'opted_in',
          source: 'manual',
        });

        const response = await rightTenant.anon
          .from('communication_opt_ins')
          .select('*')
          .eq('client_id', leftTenant.clientId);

        if (response.error) {
          throw new Error(response.error.message);
        }

        assert.equal(response.data?.length ?? 0, 0);
      },
    },
  ],
};
