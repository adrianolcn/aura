'use client';

import { useState, type FormEvent } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@aura/ui';
import type {
  AuthSignInInput,
  AuthSignUpInput,
} from '@aura/types';

import { useAuth } from '@/components/auth-provider';

type AuthMode = 'sign-in' | 'sign-up';

const signInInitialState: AuthSignInInput = {
  email: '',
  password: '',
};

const signUpInitialState: AuthSignUpInput = {
  email: '',
  password: '',
  fullName: '',
  businessName: '',
  phone: '',
  whatsappPhone: '',
};

export function LoginScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [signInData, setSignInData] = useState<AuthSignInInput>(signInInitialState);
  const [signUpData, setSignUpData] = useState<AuthSignUpInput>(signUpInitialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (mode === 'sign-in') {
        await auth.signIn(signInData);
        router.replace('/dashboard');
        router.refresh();
      } else {
        const response = await auth.signUp(signUpData);
        setMessage(
          response.requiresEmailConfirmation
            ? 'Conta criada. Confirme o email antes de entrar.'
            : 'Conta criada com sucesso. Entrando na AURA.',
        );

        if (!response.requiresEmailConfirmation) {
          router.replace('/dashboard');
          router.refresh();
        } else {
          setMode('sign-in');
          setSignInData({
            email: signUpData.email,
            password: signUpData.password,
          });
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.22),_transparent_35%),linear-gradient(180deg,_#fffaf7_0%,_#fff_100%)] px-4 py-10 text-stone-900 md:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr,0.9fr]">
        <section className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(148,74,24,0.08)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-700">AURA</p>
          <h1 className="mt-4 max-w-xl font-serif text-5xl leading-tight text-stone-950">
            Operação real para CRM, agenda, contratos e relacionamento.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-600">
            A fase 3 consolida a AURA como núcleo operacional real com auth, CRUDs, contratos versionados, uploads seguros e operação consistente entre web e mobile.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              'Auth real com criação automática do tenant profissional',
              'Clientes, eventos, orçamentos e contratos persistidos',
              'Uploads reais de imagem e PDF com timeline da cliente',
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] bg-stone-950 p-4 text-sm text-stone-100">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_24px_80px_rgba(28,25,23,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Entrar</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-950">
                {mode === 'sign-in' ? 'Acesse a operação da AURA' : 'Crie sua conta profissional'}
              </h2>
            </div>
            <button
              type="button"
              className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
              onClick={() => {
                setMode((value) => (value === 'sign-in' ? 'sign-up' : 'sign-in'));
                setError(null);
                setMessage(null);
              }}
            >
              {mode === 'sign-in' ? 'Criar conta' : 'Já tenho conta'}
            </button>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit} data-testid="auth-form">
            {mode === 'sign-up' ? (
              <>
                <LabeledInput
                  label="Nome completo"
                  value={signUpData.fullName}
                  onChange={(value) => setSignUpData((current) => ({ ...current, fullName: value }))}
                  testId="sign-up-full-name"
                />
                <LabeledInput
                  label="Nome do negócio"
                  value={signUpData.businessName}
                  onChange={(value) => setSignUpData((current) => ({ ...current, businessName: value }))}
                  testId="sign-up-business-name"
                />
                <LabeledInput
                  label="Telefone"
                  value={signUpData.phone}
                  onChange={(value) => setSignUpData((current) => ({ ...current, phone: value }))}
                  testId="sign-up-phone"
                />
                <LabeledInput
                  label="WhatsApp"
                  value={signUpData.whatsappPhone ?? ''}
                  onChange={(value) => setSignUpData((current) => ({ ...current, whatsappPhone: value }))}
                  testId="sign-up-whatsapp"
                />
              </>
            ) : null}

            <LabeledInput
              label="Email"
              type="email"
              value={mode === 'sign-in' ? signInData.email : signUpData.email}
              onChange={(value) =>
                mode === 'sign-in'
                  ? setSignInData((current) => ({ ...current, email: value }))
                  : setSignUpData((current) => ({ ...current, email: value }))
              }
              testId={mode === 'sign-in' ? 'sign-in-email' : 'sign-up-email'}
            />
            <LabeledInput
              label="Senha"
              type="password"
              value={mode === 'sign-in' ? signInData.password : signUpData.password}
              onChange={(value) =>
                mode === 'sign-in'
                  ? setSignInData((current) => ({ ...current, password: value }))
                  : setSignUpData((current) => ({ ...current, password: value }))
              }
              testId={mode === 'sign-in' ? 'sign-in-password' : 'sign-up-password'}
            />

            {error ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}
            {message ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
            ) : null}

            <div className="pt-2">
              <button
                type="submit"
                data-testid="auth-submit"
                className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading
                  ? 'Processando...'
                  : mode === 'sign-in'
                    ? 'Entrar no dashboard'
                    : 'Criar conta'}
              </button>
            </div>
          </form>

          <div className="mt-8 rounded-[1.5rem] bg-orange-50 p-5 text-sm leading-7 text-stone-600">
            Se o projeto Supabase estiver com confirmação de email ativa, o signup cria a conta e aguarda a confirmação. Com confirmação desativada, a sessão entra direto.
          </div>

          {!auth.client ? (
            <div className="mt-4 rounded-[1.5rem] bg-stone-100 p-5 text-sm leading-7 text-stone-600">
              Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para habilitar o auth real.
            </div>
          ) : null}

          <div className="mt-6">
            <Button href="https://supabase.com/docs" tone="secondary">
              Documentação do Supabase
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  testId?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-stone-600">{label}</span>
      <input
        data-testid={testId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950"
      />
    </label>
  );
}
