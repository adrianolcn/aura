'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  captureError,
  getAuthState,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  type AuraAuthState,
  type AuraSession,
  type AuraSupabaseClient,
  type AuraUser,
} from '@aura/core';
import type {
  AuthSignInInput,
  AuthSignUpInput,
  Professional,
} from '@aura/types';

import { getBrowserSupabaseClient } from '@/lib/supabase/browser';

type AuthContextValue = {
  client: AuraSupabaseClient | null;
  loading: boolean;
  session: AuraSession | null;
  user: AuraUser | null;
  professional: Professional | null;
  refresh: () => Promise<void>;
  signIn: (input: AuthSignInInput) => Promise<void>;
  signUp: (input: AuthSignUpInput) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const emptyAuthState: AuraAuthState = {
  session: null,
  user: null,
  professional: null,
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<AuraSupabaseClient | null>(null);
  const [state, setState] = useState<AuraAuthState>(emptyAuthState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const browserClient = getBrowserSupabaseClient();
      setClient(browserClient);
    } catch {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!client) {
      setState(emptyAuthState);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setState(await getAuthState(client));
    } catch (reason) {
      void captureError(reason, {
        surface: 'web-auth-refresh',
      });
      throw reason;
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!client) {
      return;
    }

    void refresh();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      loading,
      session: state.session,
      user: state.user,
      professional: state.professional,
      refresh,
      signIn: async (input) => {
        if (!client) {
          throw new Error('Supabase não configurado.');
        }

        await signInWithPassword(client, input);
      },
      signUp: async (input) => {
        if (!client) {
          throw new Error('Supabase não configurado.');
        }

        const response = await signUpWithPassword(client, input);
        return {
          requiresEmailConfirmation: !response.data.session,
        };
      },
      signOut: async () => {
        if (!client) {
          return;
        }

        await signOut(client);
      },
    }),
    [client, loading, refresh, state.professional, state.session, state.user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}
