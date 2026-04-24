import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  buildRetryMessageInput,
  canSendSelectedTemplate,
  captureError,
  createContract,
  createSignedStorageUrl,
  dispatchAutomationRules,
  formatFileSize,
  getAuthState,
  getConversationWindowState,
  resolveDocumentBucket,
  sendClientMessage,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  toUserMessage,
  updateContractStatus,
  useSignedStorageUrl,
  useClientCommunicationSnapshot,
  uploadClientAsset,
  uploadContractVersion,
  upsertAppointment,
  upsertBudget,
  upsertCommunicationOptIn,
  upsertClient,
  upsertEvent,
  useAppointments,
  useClientWorkspaceSnapshot,
  useClients,
  useDashboardSummary,
  useI18n,
} from '@aura/core';
import type {
  AppointmentInput,
  AuthSignInInput,
  AuthSignUpInput,
  BudgetInput,
  ClientInput,
  ClientEventInput,
  ContractInput,
  Professional,
} from '@aura/types';
import {
  appointmentInputSchema,
  budgetInputSchema,
  clientEventInputSchema,
  clientInputSchema,
  contractInputSchema,
} from '@aura/types';

import {
  ActionButton,
  BottomNav,
  EmptyCard,
  FeedbackCard,
  MetricCard,
  Pill,
  ScreenShell,
  SectionCard,
} from '@/components/ui';
import { DateTimeField } from '@/components/date-time-field';
import { pickSingleFile, type PickedFile } from '@/files';
import { MobileI18nProvider } from '@/i18n';
import { initializeMobileObservability } from '@/observability';
import { mobileSupabaseClient } from '@/supabase';
import { colors } from '@/theme';

type TabKey = 'dashboard' | 'clients' | 'agenda' | 'notifications';

type MobileAuthState = {
  loading: boolean;
  professional: Professional | null;
};

type ChoiceOption<T extends string> = {
  label: string;
  value: T;
};

const lifecycleStageOptions: Array<ChoiceOption<ClientInput['lifecycleStage']>> = [
  { label: 'Lead', value: 'lead' },
  { label: 'Qualificada', value: 'qualified' },
  { label: 'Proposta', value: 'proposal' },
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'Arquivada', value: 'archived' },
];

const eventStatusOptions: Array<ChoiceOption<ClientEventInput['status']>> = [
  { label: 'Lead', value: 'lead' },
  { label: 'Orçada', value: 'quoted' },
  { label: 'Reservada', value: 'booked' },
  { label: 'Concluída', value: 'completed' },
  { label: 'Cancelada', value: 'cancelled' },
];

const appointmentTypeOptions: Array<ChoiceOption<AppointmentInput['appointmentType']>> = [
  { label: 'Consulta', value: 'consultation' },
  { label: 'Teste', value: 'trial' },
  { label: 'Evento', value: 'event' },
  { label: 'Pós', value: 'follow_up' },
];

const appointmentStatusOptions: Array<ChoiceOption<AppointmentInput['status']>> = [
  { label: 'Agendado', value: 'scheduled' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Concluído', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' },
  { label: 'No-show', value: 'no_show' },
];

const budgetStatusOptions: Array<ChoiceOption<BudgetInput['status']>> = [
  { label: 'Rascunho', value: 'draft' },
  { label: 'Enviado', value: 'sent' },
  { label: 'Aprovado', value: 'approved' },
  { label: 'Recusado', value: 'rejected' },
  { label: 'Expirado', value: 'expired' },
];

const contractStatusOptions: Array<ChoiceOption<ContractInput['status']>> = [
  { label: 'Rascunho', value: 'draft' },
  { label: 'Upload', value: 'uploaded' },
  { label: 'Enviado', value: 'sent' },
  { label: 'Assinado', value: 'signed' },
  { label: 'Cancelado', value: 'cancelled' },
];

const clientInitialForm: ClientInput = {
  fullName: '',
  phone: '',
  email: '',
  city: '',
  instagramHandle: '',
  lifecycleStage: 'lead',
  priorityScore: 50,
  notes: '',
};

function createEventDraft(): Omit<ClientEventInput, 'clientId'> {
  return {
    title: '',
    eventType: 'Evento social',
    eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    location: '',
    status: 'lead',
    guestCount: undefined,
    notes: '',
  };
}

function createAppointmentDraft(): Omit<AppointmentInput, 'clientId'> {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 90 * 60 * 1000);

  return {
    eventId: undefined,
    title: '',
    appointmentType: 'consultation',
    status: 'scheduled',
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    location: '',
    notes: '',
  };
}

function createBudgetDraft(eventId?: string): Omit<BudgetInput, 'clientId'> {
  return {
    eventId: eventId ?? '',
    status: 'draft',
    currency: 'BRL',
    discountAmount: 0,
    validUntil: '',
    items: [{ description: 'Atendimento principal', quantity: 1, unitPrice: 0 }],
  };
}

function createContractDraft(eventId?: string): Omit<ContractInput, 'clientId'> {
  return {
    eventId: eventId ?? '',
    status: 'uploaded',
    signedAt: '',
  };
}

export function AuraMobileApp() {
  const [authState, setAuthState] = useState<MobileAuthState>({
    loading: true,
    professional: null,
  });
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const preferredLocale = authState.professional?.locale;

  useEffect(() => {
    initializeMobileObservability();
  }, []);

  useEffect(() => {
    const client = mobileSupabaseClient;

    if (!client) {
      setAuthState({
        loading: false,
        professional: null,
      });
      return;
    }

    const load = async () => {
      const auth = await getAuthState(client);
      setAuthState({
        loading: false,
        professional: auth.professional,
      });
    };

    void load();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (authState.loading) {
    return (
      <SafeAreaProvider>
        <MobileI18nProvider preferredLocale={preferredLocale}>
          <ScreenShell title="AURA mobile" subtitle="Carregando sessão e restaurando o workspace.">
            <SectionCard title="Inicializando" description="Conectando ao Supabase e preparando a operação real." />
          </ScreenShell>
        </MobileI18nProvider>
      </SafeAreaProvider>
    );
  }

  if (!mobileSupabaseClient) {
    return (
      <SafeAreaProvider>
        <MobileI18nProvider preferredLocale={preferredLocale}>
          <ScreenShell title="AURA mobile" subtitle="Auth real requer configuração do Supabase.">
            <SectionCard
              title="Configuração pendente"
              description="Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY para habilitar login real no mobile."
            />
          </ScreenShell>
        </MobileI18nProvider>
      </SafeAreaProvider>
    );
  }

  const supabaseClient = mobileSupabaseClient;

  if (!authState.professional) {
    return (
      <SafeAreaProvider>
        <MobileI18nProvider preferredLocale={preferredLocale}>
          <LoginScreen
            onAuthenticated={async () => {
              const auth = await getAuthState(supabaseClient);
              setAuthState({
                loading: false,
                professional: auth.professional,
              });
            }}
          />
        </MobileI18nProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <MobileI18nProvider preferredLocale={preferredLocale}>
        {selectedClientId ? (
          <ClientDetailScreen
            clientId={selectedClientId}
            activeTab={activeTab}
            onBack={() => setSelectedClientId(null)}
            onChangeTab={(tab) => {
              setSelectedClientId(null);
              setActiveTab(tab);
            }}
          />
        ) : activeTab === 'dashboard' ? (
          <DashboardScreen
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onOpenClient={setSelectedClientId}
            professional={authState.professional}
          />
        ) : activeTab === 'clients' ? (
          <ClientsScreen
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onOpenClient={setSelectedClientId}
          />
        ) : activeTab === 'agenda' ? (
          <AgendaScreen activeTab={activeTab} onChangeTab={setActiveTab} />
        ) : (
          <NotificationsScreen
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onSignOut={async () => {
              await signOut(supabaseClient);
              setActiveTab('dashboard');
            }}
            professional={authState.professional}
          />
        )}
      </MobileI18nProvider>
    </SafeAreaProvider>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const supabaseClient = mobileSupabaseClient;
  const { t } = useI18n();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [signInData, setSignInData] = useState<AuthSignInInput>({
    email: '',
    password: '',
  });
  const [signUpData, setSignUpData] = useState<AuthSignUpInput>({
    email: '',
    password: '',
    fullName: '',
    businessName: '',
    phone: '',
    whatsappPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!supabaseClient || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'sign-in') {
        await signInWithPassword(supabaseClient, signInData);
        await onAuthenticated();
      } else {
        const response = await signUpWithPassword(supabaseClient, signUpData);

        if (response.data.session) {
          await onAuthenticated();
        } else {
          setMessage(t('auth.signupConfirmation'));
          setMode('sign-in');
          setSignInData({
            email: signUpData.email,
            password: signUpData.password,
          });
        }
      }
    } catch (reason) {
      setError(toUserMessage(reason, 'Não foi possível autenticar agora.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      title={t('mobile.loginTitle')}
      subtitle={t('mobile.loginSubtitle')}
    >
      <SectionCard
        title={mode === 'sign-in' ? t('auth.eyebrow') : t('auth.switchToSignUp')}
        description="Sessão persistida no dispositivo com segregação multi-tenant por profissional."
      >
        {mode === 'sign-up' ? (
          <>
            <MobileField
              label={t('auth.fullName')}
              value={signUpData.fullName}
              onChangeText={(value) => setSignUpData((current) => ({ ...current, fullName: value }))}
            />
            <MobileField
              label={t('auth.businessName')}
              value={signUpData.businessName}
              onChangeText={(value) =>
                setSignUpData((current) => ({ ...current, businessName: value }))
              }
            />
            <MobileField
              label={t('auth.phone')}
              value={signUpData.phone}
              onChangeText={(value) => setSignUpData((current) => ({ ...current, phone: value }))}
            />
          </>
        ) : null}

        <MobileField
          label={t('auth.email')}
          value={mode === 'sign-in' ? signInData.email : signUpData.email}
          onChangeText={(value) =>
            mode === 'sign-in'
              ? setSignInData((current) => ({ ...current, email: value }))
              : setSignUpData((current) => ({ ...current, email: value }))
          }
          keyboardType="email-address"
        />
        <MobileField
          label={t('auth.password')}
          value={mode === 'sign-in' ? signInData.password : signUpData.password}
          onChangeText={(value) =>
            mode === 'sign-in'
              ? setSignInData((current) => ({ ...current, password: value }))
              : setSignUpData((current) => ({ ...current, password: value }))
          }
          secureTextEntry
        />

        {error ? <FeedbackCard tone="error" message={error} /> : null}
        {message ? <FeedbackCard tone="success" message={message} /> : null}

        <ActionButton
          label={loading ? t('common.processing') : mode === 'sign-in' ? t('auth.eyebrow') : t('auth.switchToSignUp')}
          onPress={() => void handleAuth()}
        />
        <ActionButton
          label={mode === 'sign-in' ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
          onPress={() =>
            setMode((value) => (value === 'sign-in' ? 'sign-up' : 'sign-in'))
          }
          variant="secondary"
        />
      </SectionCard>
    </ScreenShell>
  );
}

function DashboardScreen({
  activeTab,
  onChangeTab,
  onOpenClient,
  professional,
}: {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  onOpenClient: (clientId: string) => void;
  professional: Professional;
}) {
  const { t, formatCurrency, formatDateTime, appointmentStatusLabel } = useI18n();
  const { data, loading, error } = useDashboardSummary(mobileSupabaseClient);

  return (
    <ScreenShell
      title={t('dashboard.title')}
      subtitle={`${professional.businessName} • tenant pronto para operação real.`}
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      {error ? <FeedbackCard tone="error" message={error} /> : null}

      <View style={styles.metricGrid}>
        <MetricCard
          label={t('dashboard.activeClients')}
          value={String(data?.activeClients ?? 0)}
          helper={t('dashboard.activeClientsHelper')}
        />
        <MetricCard
          label={t('dashboard.pipeline')}
          value={formatCurrency(data?.revenuePipeline ?? 0)}
          helper={t('dashboard.pipelineHelper')}
        />
      </View>

      <SectionCard title={t('dashboard.nextAppointments')} description={t('dashboard.nextAppointmentsDescription')}>
        {loading ? (
          <Text style={styles.helperText}>Carregando próximos compromissos...</Text>
        ) : data?.nextAppointments.length ? (
          data.nextAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{appointment.title}</Text>
                <Text style={styles.rowSubtitle}>{formatDateTime(appointment.startsAt)}</Text>
              </View>
              <Pill tone={appointment.status === 'confirmed' ? 'success' : 'accent'}>
                {appointmentStatusLabel(appointment.status)}
              </Pill>
            </View>
          ))
        ) : (
          <EmptyCard
            title={t('agenda.emptyTitle')}
            description={t('dashboard.nextAppointmentsDescription')}
          />
        )}
      </SectionCard>

      <SectionCard title={t('dashboard.topClients')} description={t('dashboard.topClientsDescription')}>
        {data?.topClients.length ? (
          data.topClients.map((client) => (
            <Pressable key={client.id} onPress={() => onOpenClient(client.id)} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{client.fullName}</Text>
                <Text style={styles.rowSubtitle}>{client.phone}</Text>
              </View>
              <Pill tone="warning">Score {client.priorityScore}</Pill>
            </Pressable>
          ))
        ) : (
          <EmptyCard
            title="Nenhuma cliente priorizada ainda"
            description="Cadastre clientes e eventos para alimentar o núcleo operacional."
          />
        )}
      </SectionCard>
    </ScreenShell>
  );
}

function ClientsScreen({
  activeTab,
  onChangeTab,
  onOpenClient,
}: {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  onOpenClient: (clientId: string) => void;
}) {
  const { t, lifecycleStageLabel } = useI18n();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [clientForm, setClientForm] = useState<ClientInput>(clientInitialForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, loading, error, reload } = useClients(mobileSupabaseClient, {
    search: search || undefined,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });
  const localizedLifecycleStageOptions = useMemo(
    () => [
      { label: lifecycleStageLabel('lead'), value: 'lead' },
      { label: lifecycleStageLabel('qualified'), value: 'qualified' },
      { label: lifecycleStageLabel('proposal'), value: 'proposal' },
      { label: lifecycleStageLabel('confirmed'), value: 'confirmed' },
      { label: lifecycleStageLabel('archived'), value: 'archived' },
    ],
    [lifecycleStageLabel],
  );

  const handleCreateClient = async () => {
    if (!mobileSupabaseClient || busy) {
      return;
    }

    setBusy(true);
    setActionError(null);
    setMessage(null);

    try {
      await upsertClient(mobileSupabaseClient, clientInputSchema.parse(clientForm));
      setClientForm(clientInitialForm);
      setShowCreate(false);
      setMessage(t('clients.saved'));
      reload();
    } catch (reason) {
      setActionError(toUserMessage(reason, 'Não foi possível salvar a cliente.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell
      title={t('nav.clients')}
      subtitle="Busca real por nome ou telefone, cadastro e acesso ao detalhe operacional."
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      <SectionCard title={t('clients.search')} description="Nome e telefone são os atalhos principais da operação.">
        <MobileField
          label={t('clients.search')}
          value={search}
          onChangeText={setSearch}
          placeholder={t('clients.searchPlaceholder')}
        />
      </SectionCard>

      {error ? <FeedbackCard tone="error" message={error} /> : null}
      {actionError ? <FeedbackCard tone="error" message={actionError} /> : null}
      {message ? <FeedbackCard tone="success" message={message} /> : null}

      <SectionCard
        title={t('clients.new')}
        description="Cadastro persistido no Supabase com validação compartilhada por Zod."
      >
        {showCreate ? (
          <View style={styles.cardBody}>
            <MobileField
              label={t('clients.fullName')}
              value={clientForm.fullName}
              onChangeText={(value) => setClientForm((current) => ({ ...current, fullName: value }))}
            />
            <MobileField
              label={t('auth.phone')}
              value={clientForm.phone}
              onChangeText={(value) => setClientForm((current) => ({ ...current, phone: value }))}
            />
            <MobileField
              label={t('auth.email')}
              value={clientForm.email ?? ''}
              onChangeText={(value) => setClientForm((current) => ({ ...current, email: value }))}
              keyboardType="email-address"
            />
            <MobileField
              label={t('clients.city')}
              value={clientForm.city ?? ''}
              onChangeText={(value) => setClientForm((current) => ({ ...current, city: value }))}
            />
            <MobileField
              label={t('clients.instagram')}
              value={clientForm.instagramHandle ?? ''}
              onChangeText={(value) =>
                setClientForm((current) => ({ ...current, instagramHandle: value }))
              }
            />
            <MobileField
              label={t('clients.priorityScore')}
              value={String(clientForm.priorityScore)}
              onChangeText={(value) =>
                setClientForm((current) => ({
                  ...current,
                  priorityScore: Number(value || 0),
                }))
              }
              keyboardType="numeric"
            />
            <ChoiceField
              label={t('clients.lifecycleStage')}
              value={clientForm.lifecycleStage}
              options={localizedLifecycleStageOptions}
              onChange={(value) =>
                setClientForm((current) => ({
                  ...current,
                  lifecycleStage: value as ClientInput['lifecycleStage'],
                }))
              }
            />
            <MobileField
              label={t('clients.notes')}
              value={clientForm.notes ?? ''}
              onChangeText={(value) => setClientForm((current) => ({ ...current, notes: value }))}
              multiline
            />
            <ActionButton
              label={busy ? t('common.processing') : t('common.save')}
              onPress={() => void handleCreateClient()}
            />
            <ActionButton
              label={t('common.cancel')}
              onPress={() => setShowCreate(false)}
              variant="secondary"
            />
          </View>
        ) : (
          <ActionButton label={t('clients.save')} onPress={() => setShowCreate(true)} />
        )}
      </SectionCard>

      <SectionCard title={t('clients.pipelineTitle')} description="Lista real com loading, vazio e erro tratados.">
        {loading ? (
          <Text style={styles.helperText}>Carregando clientes...</Text>
        ) : data?.length ? (
          <View style={styles.cardBody}>
            {data.map((item) => (
              <Pressable key={item.id} onPress={() => onOpenClient(item.id)} style={styles.rowCard}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{item.fullName}</Text>
                  <Text style={styles.rowSubtitle}>{item.phone}</Text>
                  <Text style={styles.rowCaption}>{item.city ?? t('common.notInformed')}</Text>
                </View>
                <Pill tone={item.lifecycleStage === 'confirmed' ? 'success' : 'accent'}>
                  {lifecycleStageLabel(item.lifecycleStage)}
                </Pill>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyCard
            title={t('clients.emptyTitle')}
            description={t('clients.emptyDescription')}
          />
        )}
      </SectionCard>
    </ScreenShell>
  );
}

function ClientDetailScreen({
  clientId,
  onBack,
  activeTab,
  onChangeTab,
}: {
  clientId: string;
  onBack: () => void;
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
}) {
  const {
    t,
    formatCurrency,
    formatDate,
    formatDateTime,
    eventStatusLabel,
    appointmentStatusLabel,
    budgetStatusLabel,
    messageStatusLabel,
  } = useI18n();
  const { data, loading, error, reload } = useClientWorkspaceSnapshot(
    mobileSupabaseClient,
    clientId,
    {
      refreshIntervalMs: 15000,
    },
  );
  const {
    data: communicationData,
    loading: communicationLoading,
    error: communicationError,
    reload: reloadCommunication,
  } = useClientCommunicationSnapshot(mobileSupabaseClient, clientId, {
    refreshIntervalMs: 15000,
  });
  const [clientForm, setClientForm] = useState<ClientInput>(clientInitialForm);
  const [eventForm, setEventForm] = useState<Omit<ClientEventInput, 'clientId'>>(createEventDraft());
  const [appointmentForm, setAppointmentForm] =
    useState<Omit<AppointmentInput, 'clientId'>>(createAppointmentDraft());
  const [budgetForm, setBudgetForm] = useState<Omit<BudgetInput, 'clientId'>>(createBudgetDraft());
  const [contractForm, setContractForm] =
    useState<Omit<ContractInput, 'clientId'>>(createContractDraft());
  const [assetEventId, setAssetEventId] = useState<string | undefined>(undefined);
  const [assetCaption, setAssetCaption] = useState('');
  const [assetFile, setAssetFile] = useState<PickedFile | null>(null);
  const [contractFile, setContractFile] = useState<PickedFile | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateParameters, setTemplateParameters] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    setClientForm({
      fullName: data.client.fullName,
      phone: data.client.phone,
      email: data.client.email ?? '',
      city: data.client.city ?? '',
      instagramHandle: data.client.instagramHandle ?? '',
      lifecycleStage: data.client.lifecycleStage,
      priorityScore: data.score?.priorityScore ?? data.client.priorityScore,
      notes: data.client.notes ?? '',
    });

    const firstEventId = data.events[0]?.id;
    setBudgetForm(createBudgetDraft(firstEventId));
    setContractForm(createContractDraft(firstEventId));
  }, [data]);

  useEffect(() => {
    if (!communicationData?.templates.length) {
      setSelectedTemplateId('');
      setTemplateParameters({});
      return;
    }

    if (
      selectedTemplateId &&
      communicationData.templates.some((template) => template.id === selectedTemplateId)
    ) {
      return;
    }

    const firstTemplate = communicationData.templates[0];
    setSelectedTemplateId(firstTemplate.id);
    const keys = firstTemplate.parameterSchema.length
      ? firstTemplate.parameterSchema
      : firstTemplate.variables;
    setTemplateParameters(Object.fromEntries(keys.map((key) => [key, ''])));
  }, [communicationData?.templates, selectedTemplateId]);

  const eventOptions = useMemo(
    () =>
      (data?.events ?? []).map((eventItem) => ({
        id: eventItem.id,
        label: `${eventItem.title} • ${formatDateTime(eventItem.eventDate)}`,
      })),
    [data?.events, formatDateTime],
  );
  const selectedTemplate = useMemo(
    () =>
      communicationData?.templates.find((template) => template.id === selectedTemplateId),
    [communicationData?.templates, selectedTemplateId],
  );
  const conversationWindow = useMemo(
    () => getConversationWindowState(communicationData?.conversation),
    [communicationData?.conversation],
  );
  const selectedTemplateAllowsSend = useMemo(
    () => canSendSelectedTemplate(selectedTemplate, communicationData?.optIn),
    [communicationData?.optIn, selectedTemplate],
  );

  const runAction = useCallback(
    async (label: string, task: () => Promise<void>, successMessage: string) => {
      if (busyAction) {
        return;
      }

      setBusyAction(label);
      setActionError(null);
      setMessage(null);

      try {
        await task();
        setMessage(successMessage);
        await Promise.all([reload(), reloadCommunication()]);
      } catch (reason) {
        void captureError(reason, {
          surface: 'mobile-client-detail',
          action: label,
          clientId,
        });
        setActionError(toUserMessage(reason, t('clientDetail.error.actionFailed')));
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, clientId, reload, reloadCommunication, t],
  );

  const openFile = useCallback(
    async (
      bucket: 'client-media' | 'contracts' | 'documents',
      path: string,
      successMessage: string,
    ) => {
      if (!mobileSupabaseClient) {
        return;
      }

      try {
        const url = await createSignedStorageUrl(mobileSupabaseClient, bucket, path);
        await Linking.openURL(url);
        setMessage(successMessage);
      } catch (reason) {
        void captureError(reason, {
          surface: 'mobile-file-open',
          bucket,
          path,
          clientId,
        });
        setActionError(toUserMessage(reason, t('clientDetail.assets.openError')));
      }
    },
    [clientId, t],
  );

  return (
    <ScreenShell
      title={data?.client.fullName ?? t('nav.clients')}
      subtitle={t('clientDetail.mobile.subtitle')}
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      <ActionButton label={t('common.backToClients')} onPress={onBack} variant="secondary" />

      {error ? <FeedbackCard tone="error" message={error} /> : null}
      {communicationError ? <FeedbackCard tone="error" message={communicationError} /> : null}
      {actionError ? <FeedbackCard tone="error" message={actionError} /> : null}
      {message ? <FeedbackCard tone="success" message={message} /> : null}

      {loading || communicationLoading || !data || !communicationData ? (
        <SectionCard title={t('common.loading')} description={t('mobile.clientDetail.loadingDescription')} />
      ) : (
        <>
          <View style={styles.metricGrid}>
            <MetricCard
              label={t('clientDetail.stats.eventsLabel')}
              value={String(data.events.length)}
              helper={t('clientDetail.stats.eventsHelper')}
            />
            <MetricCard
              label={t('nav.contracts')}
              value={String(data.contracts.length)}
              helper={t('clientDetail.stats.contractsHelper')}
            />
          </View>

          <SectionCard title={t('clientDetail.summary.title')} description={t('clientDetail.summary.description')}>
            <View style={styles.cardBody}>
              <MobileField
                label={t('clients.fullName')}
                value={clientForm.fullName}
                onChangeText={(value) => setClientForm((current) => ({ ...current, fullName: value }))}
              />
              <MobileField
                label={t('clients.phone')}
                value={clientForm.phone}
                onChangeText={(value) => setClientForm((current) => ({ ...current, phone: value }))}
              />
              <MobileField
                label={t('clients.email')}
                value={clientForm.email ?? ''}
                onChangeText={(value) => setClientForm((current) => ({ ...current, email: value }))}
                keyboardType="email-address"
              />
              <MobileField
                label={t('clients.city')}
                value={clientForm.city ?? ''}
                onChangeText={(value) => setClientForm((current) => ({ ...current, city: value }))}
              />
              <MobileField
                label={t('clients.instagram')}
                value={clientForm.instagramHandle ?? ''}
                onChangeText={(value) =>
                  setClientForm((current) => ({ ...current, instagramHandle: value }))
                }
              />
              <MobileField
                label={t('clients.priorityScore')}
                value={String(clientForm.priorityScore)}
                onChangeText={(value) =>
                  setClientForm((current) => ({
                    ...current,
                    priorityScore: Number(value || 0),
                  }))
                }
                keyboardType="numeric"
              />
              <ChoiceField
                label={t('clients.stage')}
                value={clientForm.lifecycleStage}
                options={lifecycleStageOptions}
                onChange={(value) =>
                  setClientForm((current) => ({ ...current, lifecycleStage: value }))
                }
              />
              <MobileField
                label={t('clients.notes')}
                value={clientForm.notes ?? ''}
                onChangeText={(value) => setClientForm((current) => ({ ...current, notes: value }))}
                multiline
              />
              <ActionButton
                label={busyAction === 'save-client' ? t('common.processing') : t('clientDetail.summary.save')}
                onPress={() =>
                  void runAction(
                    'save-client',
                    async () => {
                      await upsertClient(
                        mobileSupabaseClient!,
                        clientInputSchema.parse(clientForm),
                        clientId,
                      );
                    },
                    t('clientDetail.summary.saved'),
                  )
                }
              />
            </View>
          </SectionCard>

          <SectionCard title={t('clientDetail.timeline.title')} description={t('clientDetail.timeline.description')}>
            {data.timeline.length ? (
              data.timeline.slice(0, 8).map((item) => (
                <View key={item.id} style={styles.timelineItem}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowCaption}>{item.description}</Text>
                  <Text style={styles.timelineDate}>{formatDateTime(item.happenedAt)}</Text>
                </View>
              ))
            ) : (
              <EmptyCard
                title={t('clientDetail.timeline.emptyTitle')}
                description={t('clientDetail.timeline.empty')}
              />
            )}
          </SectionCard>

          <SectionCard
            title={t('clientDetail.inbox.title')}
            description={t('clientDetail.inbox.description')}
          >
            <View style={styles.cardBody}>
              <View style={styles.inlineCard}>
                <View style={styles.rowCard}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{t('clientDetail.inbox.optInTitle')}</Text>
                    <Text style={styles.rowCaption}>
                      {communicationData.optIn
                        ? t('clientDetail.inbox.optInStatus', {
                            status: communicationData.optIn.status,
                            source: communicationData.optIn.source,
                          })
                        : t('clientDetail.inbox.optInEmpty')}
                    </Text>
                  </View>
                  <Pill tone={communicationData.optIn?.status === 'opted_in' ? 'success' : 'warning'}>
                    {communicationData.optIn?.status ?? t('clientDetail.inbox.pending')}
                  </Pill>
                </View>
                <Text style={styles.rowCaption}>
                  {communicationData.optIn?.grantedAt
                    ? t('clientDetail.inbox.optInGrantedAt', {
                        value: formatDateTime(communicationData.optIn.grantedAt),
                      })
                    : t('clientDetail.inbox.optInHint')}
                </Text>
                <View style={styles.actionRow}>
                  <ActionButton
                    label={busyAction === 'opt-in' ? t('common.processing') : t('clientDetail.inbox.registerOptIn')}
                    disabled={Boolean(busyAction)}
                    onPress={() =>
                      void runAction(
                        'opt-in',
                        async () => {
                          await upsertCommunicationOptIn(mobileSupabaseClient!, {
                            clientId,
                            channel: 'whatsapp',
                            status: 'opted_in',
                            source: 'manual',
                          });
                        },
                        t('clientDetail.inbox.optInSaved'),
                      )
                    }
                  />
                  <ActionButton
                    label={busyAction === 'opt-out' ? t('common.processing') : t('clientDetail.inbox.revokeOptIn')}
                    disabled={Boolean(busyAction)}
                    onPress={() =>
                      void runAction(
                        'opt-out',
                        async () => {
                          await upsertCommunicationOptIn(mobileSupabaseClient!, {
                            clientId,
                            channel: 'whatsapp',
                            status: 'opted_out',
                            source: 'manual',
                          });
                        },
                        t('clientDetail.inbox.optOutSaved'),
                      )
                    }
                    variant="secondary"
                  />
                </View>
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>
                  {conversationWindow.status === 'open'
                    ? t('clientDetail.inbox.windowOpen')
                    : conversationWindow.status === 'expired'
                      ? t('clientDetail.inbox.windowExpired')
                      : t('clientDetail.inbox.windowUnavailable')}
                </Text>
                <Text style={styles.rowCaption}>{conversationWindow.helperText}</Text>
                <Text style={styles.timelineDate}>{t('common.automaticSync')}</Text>
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>{t('clientDetail.inbox.templateTitle')}</Text>
                <Text style={styles.rowCaption}>
                  {t('clientDetail.inbox.templateDescription')}
                </Text>
                {communicationData.templates.length ? (
                  <>
                    <ChoiceField
                      label={t('clientDetail.inbox.templateField')}
                      value={selectedTemplateId}
                      options={communicationData.templates.map((template) => ({
                        label: template.name,
                        value: template.id,
                      }))}
                      onChange={(value) => {
                        setSelectedTemplateId(value);
                        const template = communicationData.templates.find((item) => item.id === value);
                        const keys = template
                          ? template.parameterSchema.length
                            ? template.parameterSchema
                            : template.variables
                          : [];
                        setTemplateParameters(Object.fromEntries(keys.map((key) => [key, ''])));
                      }}
                    />
                    {selectedTemplate ? (
                      <View style={styles.inlineCard}>
                        <Text style={styles.rowTitle}>
                          {selectedTemplate.externalTemplateName ?? t('clientDetail.inbox.mappingPending')}
                        </Text>
                        <Text style={styles.rowCaption}>{selectedTemplate.body}</Text>
                        <Text style={styles.timelineDate}>
                          {selectedTemplate.requiresOptIn
                            ? t('clientDetail.inbox.templateRequiresOptIn')
                            : t('clientDetail.inbox.templateNoOptIn')}
                        </Text>
                      </View>
                    ) : null}
                    {(selectedTemplate?.parameterSchema.length
                      ? selectedTemplate.parameterSchema
                      : selectedTemplate?.variables ?? []
                    ).map((key) => (
                      <MobileField
                        key={key}
                        label={key}
                        value={templateParameters[key] ?? ''}
                        onChangeText={(value) =>
                          setTemplateParameters((current) => ({
                            ...current,
                            [key]: value,
                          }))
                        }
                      />
                    ))}
                    {!selectedTemplateAllowsSend ? (
                      <FeedbackCard
                        tone="warning"
                        message={t('clientDetail.inbox.templateBlocked')}
                      />
                    ) : null}
                    <ActionButton
                      label={busyAction === 'send-template' ? t('common.processing') : t('clientDetail.inbox.sendTemplate')}
                      disabled={
                        Boolean(busyAction) ||
                        !selectedTemplateId ||
                        !selectedTemplateAllowsSend
                      }
                      onPress={() =>
                        void runAction(
                          'send-template',
                          async () => {
                            if (!selectedTemplateId || !selectedTemplateAllowsSend) {
                              throw new Error(
                                t('clientDetail.inbox.templateSelectionError'),
                              );
                            }

                            await sendClientMessage(mobileSupabaseClient!, {
                              clientId,
                              conversationId: communicationData.conversation?.id,
                              templateId: selectedTemplateId,
                              parameters: templateParameters,
                              eventId: data.events[0]?.id,
                            });
                          },
                          t('clientDetail.inbox.templateSent'),
                        )
                      }
                    />
                  </>
                ) : (
                  <EmptyCard
                    title={t('clientDetail.inbox.noTemplatesTitle')}
                    description={t('clientDetail.inbox.noTemplatesDescription')}
                  />
                )}
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>{t('clientDetail.inbox.replyTitle')}</Text>
                <Text style={styles.rowCaption}>
                  {t('clientDetail.inbox.replyDescription')}
                </Text>
                <MobileField
                  label={t('common.message')}
                  value={messageBody}
                  onChangeText={setMessageBody}
                  multiline
                  placeholder={
                    conversationWindow.canSendFreeText
                      ? t('clientDetail.inbox.replyPlaceholder')
                      : t('mobile.inboxBlocked')
                  }
                />
                <ActionButton
                  label={busyAction === 'send-text' ? t('common.processing') : t('clientDetail.inbox.sendReply')}
                  disabled={
                    Boolean(busyAction) ||
                    !messageBody.trim() ||
                    !conversationWindow.canSendFreeText
                  }
                  onPress={() =>
                    void runAction(
                      'send-text',
                      async () => {
                        if (!conversationWindow.canSendFreeText) {
                          throw new Error(
                            t('clientDetail.inbox.windowExpiredError'),
                          );
                        }

                        await sendClientMessage(mobileSupabaseClient!, {
                          clientId,
                          conversationId: communicationData.conversation?.id,
                          body: messageBody.trim(),
                          parameters: {},
                          eventId: data.events[0]?.id,
                        });
                        setMessageBody('');
                      },
                      t('clientDetail.inbox.replySent'),
                    )
                  }
                  variant={conversationWindow.canSendFreeText ? 'primary' : 'secondary'}
                />
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>{t('common.history')}</Text>
                {communicationData.conversation?.messages.length ? (
                  communicationData.conversation.messages.map((conversationMessage) => (
                    <View
                      key={conversationMessage.id}
                      style={[
                        styles.chatBubble,
                        conversationMessage.direction === 'outbound'
                          ? styles.chatBubbleOutbound
                          : styles.chatBubbleInbound,
                      ]}
                    >
                      <View style={styles.rowCard}>
                        <View style={styles.rowText}>
                          <Text
                            style={[
                              styles.rowTitle,
                              conversationMessage.direction === 'outbound'
                                ? styles.chatTextInverted
                                : null,
                            ]}
                          >
                            {conversationMessage.messageType === 'template'
                              ? conversationMessage.templateName ?? t('clientDetail.inbox.templateFallback')
                              : conversationMessage.body}
                          </Text>
                          {conversationMessage.messageType === 'template' ? (
                            <Text
                              style={[
                                styles.rowCaption,
                                conversationMessage.direction === 'outbound'
                                  ? styles.chatTextMutedInverted
                                  : null,
                              ]}
                            >
                              {conversationMessage.body}
                            </Text>
                          ) : null}
                        </View>
                        <Pill
                          tone={
                            conversationMessage.status === 'read'
                              ? 'success'
                              : conversationMessage.status === 'failed'
                                ? 'warning'
                                : 'accent'
                          }
                        >
                          {messageStatusLabel(conversationMessage.status)}
                        </Pill>
                      </View>
                      {conversationMessage.errorMessage ? (
                        <Text style={styles.chatErrorText}>{conversationMessage.errorMessage}</Text>
                      ) : null}
                      {conversationMessage.direction === 'outbound' &&
                      conversationMessage.status === 'failed' ? (
                        <ActionButton
                          label={
                            busyAction === `retry-message-${conversationMessage.id}`
                              ? t('common.processing')
                              : t('common.retry')
                          }
                          disabled={Boolean(busyAction)}
                          onPress={() =>
                            void runAction(
                              `retry-message-${conversationMessage.id}`,
                              async () => {
                                await sendClientMessage(
                                  mobileSupabaseClient!,
                                  buildRetryMessageInput(clientId, conversationMessage),
                                );
                              },
                              t('clientDetail.inbox.retrySent'),
                            )
                          }
                          variant="secondary"
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.rowCaption,
                          conversationMessage.direction === 'outbound'
                            ? styles.chatTextMutedInverted
                            : null,
                        ]}
                      >
                        {formatDateTime(conversationMessage.createdAt)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <EmptyCard
                    title={t('clientDetail.inbox.historyEmptyTitle')}
                    description={t('clientDetail.inbox.historyEmpty')}
                  />
                )}
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>{t('clientDetail.inbox.automationTitle')}</Text>
                <Text style={styles.rowCaption}>
                  {t('clientDetail.inbox.automationDescription')}
                </Text>
                <ActionButton
                  label={busyAction === 'dispatch-automation' ? t('common.processing') : t('clientDetail.inbox.runAutomations')}
                  disabled={Boolean(busyAction)}
                  onPress={() =>
                    void runAction(
                      'dispatch-automation',
                      async () => {
                        const result = await dispatchAutomationRules(mobileSupabaseClient!, {
                          clientId,
                        });
                        setMessage(
                          t('clientDetail.inbox.automationResult', {
                            processed: String(result.processedCount),
                            skipped: String(result.skippedCount),
                            failed: String(result.failedCount),
                          }),
                        );
                      },
                      t('clientDetail.inbox.runAutomations'),
                    )
                  }
                  variant="secondary"
                />
                {communicationData.notificationLogs.map((entry) => (
                  <View key={entry.id} style={styles.timelineItem}>
                    <Text style={styles.rowTitle}>{entry.executionKind}</Text>
                    <Text style={styles.rowCaption}>
                      {entry.errorMessage ??
                        t('clientDetail.inbox.automationScheduledFor', {
                          value: formatDateTime(entry.scheduledFor),
                        })}
                    </Text>
                  </View>
                ))}
                {communicationData.dispatchRuns.map((entry) => (
                  <View key={entry.id} style={styles.timelineItem}>
                    <Text style={styles.rowTitle}>
                      {entry.triggerSource} • {entry.status}
                    </Text>
                    <Text style={styles.rowCaption}>
                      {t('clientDetail.inbox.schedulerSummary', {
                        processed: String(entry.processedCount),
                        skipped: String(entry.skippedCount),
                        failed: String(entry.failedCount),
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </SectionCard>

          <SectionCard title={t('clientDetail.events.title')} description={t('clientDetail.events.description')}>
            <View style={styles.cardBody}>
              <MobileField
                label={t('common.title')}
                value={eventForm.title}
                onChangeText={(value) => setEventForm((current) => ({ ...current, title: value }))}
              />
              <MobileField
                label={t('clientDetail.eventType')}
                value={eventForm.eventType}
                onChangeText={(value) =>
                  setEventForm((current) => ({ ...current, eventType: value }))
                }
              />
              <MobileField
                label={t('clients.location')}
                value={eventForm.location ?? ''}
                onChangeText={(value) => setEventForm((current) => ({ ...current, location: value }))}
              />
              <DateTimeField
                label={t('clientDetail.eventDate')}
                value={eventForm.eventDate}
                onChange={(nextValue) =>
                  setEventForm((current) => ({
                    ...current,
                    eventDate: nextValue ?? current.eventDate,
                  }))
                }
              />
              <ChoiceField
                label={t('common.status')}
                value={eventForm.status}
                options={eventStatusOptions}
                onChange={(value) => setEventForm((current) => ({ ...current, status: value }))}
              />
              <MobileField
                label={t('clientDetail.guestCount')}
                value={eventForm.guestCount ? String(eventForm.guestCount) : ''}
                onChangeText={(value) =>
                  setEventForm((current) => ({
                    ...current,
                    guestCount: value ? Number(value) : undefined,
                  }))
                }
                keyboardType="numeric"
              />
              <MobileField
                label={t('clients.notes')}
                value={eventForm.notes ?? ''}
                onChangeText={(value) => setEventForm((current) => ({ ...current, notes: value }))}
                multiline
              />
              <ActionButton
                label={busyAction === 'create-event' ? t('common.processing') : t('clientDetail.events.create')}
                onPress={() =>
                  void runAction(
                    'create-event',
                    async () => {
                      await upsertEvent(
                        mobileSupabaseClient!,
                        clientEventInputSchema.parse({
                          ...eventForm,
                          clientId,
                        }),
                      );
                      setEventForm(createEventDraft());
                    },
                    t('clientDetail.eventCreated'),
                  )
                }
              />
              {data.events.length ? (
                data.events.map((eventItem) => (
                  <View key={eventItem.id} style={styles.rowCard}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{eventItem.title}</Text>
                      <Text style={styles.rowSubtitle}>{formatDateTime(eventItem.eventDate)}</Text>
                      <Text style={styles.rowCaption}>{eventItem.location ?? t('common.notInformed')}</Text>
                    </View>
                    <Pill tone={eventItem.status === 'booked' ? 'success' : 'accent'}>
                      {eventStatusLabel(eventItem.status)}
                    </Pill>
                  </View>
                ))
              ) : (
                <EmptyCard
                  title={t('clientDetail.noEventsTitle')}
                  description={t('clientDetail.noEventsDescription')}
                />
              )}
            </View>
          </SectionCard>

          <SectionCard title={t('clientDetail.appointmentsTitle')} description={t('clientDetail.appointmentsDescription')}>
            <View style={styles.cardBody}>
              <MobileField
                label={t('common.title')}
                value={appointmentForm.title}
                onChangeText={(value) =>
                  setAppointmentForm((current) => ({ ...current, title: value }))
                }
              />
              <ChoiceField
                label={t('common.type')}
                value={appointmentForm.appointmentType}
                options={appointmentTypeOptions}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, appointmentType: value }))
                }
              />
              <ChoiceField
                label={t('common.status')}
                value={appointmentForm.status}
                options={appointmentStatusOptions}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, status: value }))
                }
              />
              <ChoiceField
                label={t('clientDetail.relatedEvent')}
                value={appointmentForm.eventId ?? ''}
                options={[
                  { label: t('common.noSpecificEvent'), value: '' },
                  ...eventOptions.map((eventOption) => ({
                    label: eventOption.label,
                    value: eventOption.id,
                  })),
                ]}
                onChange={(value) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    eventId: value || undefined,
                  }))
                }
              />
              <DateTimeField
                label={t('common.start')}
                value={appointmentForm.startsAt}
                onChange={(nextValue) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    startsAt: nextValue ?? current.startsAt,
                  }))
                }
              />
              <DateTimeField
                label={t('common.end')}
                value={appointmentForm.endsAt}
                onChange={(nextValue) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    endsAt: nextValue ?? current.endsAt,
                  }))
                }
              />
              <MobileField
                label={t('clients.location')}
                value={appointmentForm.location ?? ''}
                onChangeText={(value) =>
                  setAppointmentForm((current) => ({ ...current, location: value }))
                }
              />
              <MobileField
                label={t('clients.notes')}
                value={appointmentForm.notes ?? ''}
                onChangeText={(value) =>
                  setAppointmentForm((current) => ({ ...current, notes: value }))
                }
                multiline
              />
              <ActionButton
                label={busyAction === 'create-appointment' ? t('common.processing') : t('clientDetail.agenda.create')}
                onPress={() =>
                  void runAction(
                    'create-appointment',
                    async () => {
                      await upsertAppointment(
                        mobileSupabaseClient!,
                        appointmentInputSchema.parse({
                          ...appointmentForm,
                          clientId,
                          eventId: appointmentForm.eventId || undefined,
                        }),
                      );
                      setAppointmentForm(createAppointmentDraft());
                    },
                    t('clientDetail.appointmentCreated'),
                  )
                }
              />
              {data.appointments.length ? (
                data.appointments.map((appointment) => (
                  <View key={appointment.id} style={styles.rowCard}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{appointment.title}</Text>
                      <Text style={styles.rowSubtitle}>{formatDateTime(appointment.startsAt)}</Text>
                      <Text style={styles.rowCaption}>{appointment.location ?? t('common.notInformed')}</Text>
                    </View>
                    <Pill tone={appointment.status === 'confirmed' ? 'success' : 'accent'}>
                      {appointmentStatusLabel(appointment.status)}
                    </Pill>
                  </View>
                ))
              ) : (
                <EmptyCard
                  title={t('clientDetail.noAppointmentsTitle')}
                  description={t('clientDetail.noAppointmentsDescription')}
                />
              )}
            </View>
          </SectionCard>

          <SectionCard title={t('clientDetail.budgetsTitle')} description={t('clientDetail.budgetsDescription')}>
            <View style={styles.cardBody}>
              <ChoiceField
                label={t('common.event')}
                value={budgetForm.eventId}
                options={eventOptions.map((eventOption) => ({
                  label: eventOption.label,
                  value: eventOption.id,
                }))}
                onChange={(value) => setBudgetForm((current) => ({ ...current, eventId: value }))}
              />
              <ChoiceField
                label={t('common.status')}
                value={budgetForm.status}
                options={budgetStatusOptions}
                onChange={(value) => setBudgetForm((current) => ({ ...current, status: value }))}
              />
              <DateTimeField
                label={t('common.validUntil')}
                value={budgetForm.validUntil || undefined}
                onChange={(nextValue) =>
                  setBudgetForm((current) => ({
                    ...current,
                    validUntil: nextValue ?? '',
                  }))
                }
              />
              <MobileField
                label={t('common.discount')}
                value={String(budgetForm.discountAmount)}
                onChangeText={(value) =>
                  setBudgetForm((current) => ({
                    ...current,
                    discountAmount: Number(value || 0),
                  }))
                }
                keyboardType="numeric"
              />
              {budgetForm.items.map((item, index) => (
                <View key={`${item.description}-${index}`} style={styles.inlineCard}>
                  <MobileField
                    label={`${t('common.description')} ${index + 1}`}
                    value={item.description}
                    onChangeText={(value) =>
                      setBudgetForm((current) => ({
                        ...current,
                        items: current.items.map((currentItem, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...currentItem,
                                description: value,
                              }
                            : currentItem,
                        ),
                      }))
                    }
                  />
                  <MobileField
                    label={t('common.quantity')}
                    value={String(item.quantity)}
                    onChangeText={(value) =>
                      setBudgetForm((current) => ({
                        ...current,
                        items: current.items.map((currentItem, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...currentItem,
                                quantity: Number(value || 1),
                              }
                            : currentItem,
                        ),
                      }))
                    }
                    keyboardType="numeric"
                  />
                  <MobileField
                    label={t('common.unitPrice')}
                    value={String(item.unitPrice)}
                    onChangeText={(value) =>
                      setBudgetForm((current) => ({
                        ...current,
                        items: current.items.map((currentItem, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...currentItem,
                                unitPrice: Number(value || 0),
                              }
                            : currentItem,
                        ),
                      }))
                    }
                    keyboardType="numeric"
                  />
                </View>
              ))}
              <ActionButton
                label={t('common.addItem')}
                onPress={() =>
                  setBudgetForm((current) => ({
                    ...current,
                    items: [...current.items, { description: '', quantity: 1, unitPrice: 0 }],
                  }))
                }
                variant="secondary"
              />
              <ActionButton
                label={busyAction === 'create-budget' ? t('common.processing') : t('clientDetail.budgets.create')}
                onPress={() =>
                  void runAction(
                    'create-budget',
                    async () => {
                      await upsertBudget(
                        mobileSupabaseClient!,
                        budgetInputSchema.parse({
                          ...budgetForm,
                          clientId,
                          validUntil: budgetForm.validUntil || undefined,
                        }),
                      );
                      setBudgetForm(createBudgetDraft(data.events[0]?.id));
                    },
                    t('clientDetail.budgetCreated'),
                  )
                }
              />
              {data.budgets.length ? (
                data.budgets.map((budget) => (
                  <View key={budget.id} style={styles.rowCard}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{formatCurrency(budget.totalAmount)}</Text>
                      <Text style={styles.rowSubtitle}>
                        {budget.items.length} item(ns) • {budgetStatusLabel(budget.status)}
                      </Text>
                      <Text style={styles.rowCaption}>
                        {t('common.validUntil')} {budget.validUntil ? formatDate(budget.validUntil) : t('common.all')}
                      </Text>
                    </View>
                    <Pill tone={budget.status === 'approved' ? 'success' : 'warning'}>
                      {budgetStatusLabel(budget.status)}
                    </Pill>
                  </View>
                ))
              ) : (
                <EmptyCard
                  title={t('clientDetail.noBudgetsTitle')}
                  description={t('clientDetail.noBudgetsDescription')}
                />
              )}
            </View>
          </SectionCard>

          <SectionCard title={t('clientDetail.contractsTitle')} description={t('clientDetail.contractsDescription')}>
            <View style={styles.cardBody}>
              <ChoiceField
                label={t('common.event')}
                value={contractForm.eventId}
                options={eventOptions.map((eventOption) => ({
                  label: eventOption.label,
                  value: eventOption.id,
                }))}
                onChange={(value) => setContractForm((current) => ({ ...current, eventId: value }))}
              />
              <ChoiceField
                label={t('common.initialStatus')}
                value={contractForm.status}
                options={contractStatusOptions}
                onChange={(value) => setContractForm((current) => ({ ...current, status: value }))}
              />
              <DateTimeField
                label={t('common.signedAt')}
                value={contractForm.signedAt || undefined}
                onChange={(nextValue) =>
                  setContractForm((current) => ({
                    ...current,
                    signedAt: nextValue ?? '',
                  }))
                }
              />
              <ActionButton
                label={contractFile ? `PDF: ${contractFile.fileName}` : t('clientDetail.selectContractPdf')}
                onPress={() =>
                  void (async () => {
                    const file = await pickSingleFile(['application/pdf', '.pdf']);
                    if (file) {
                      setContractFile(file);
                    }
                  })()
                }
                variant="secondary"
              />
              {contractFile ? (
                <FileSummaryCard
                  title={contractFile.fileName}
                  subtitle={`${contractFile.contentType} • ${formatFileSize(contractFile.sizeBytes)}`}
                />
              ) : null}
              <ActionButton
                label={busyAction === 'create-contract' ? t('common.processing') : t('clientDetail.contracts.create')}
                onPress={() =>
                  void runAction(
                    'create-contract',
                    async () => {
                      if (!contractFile) {
                        throw new Error(t('clientDetail.contracts.selectPdf'));
                      }

                      await createContract(
                        mobileSupabaseClient!,
                        contractInputSchema.parse({
                          ...contractForm,
                          clientId,
                          signedAt: contractForm.signedAt || undefined,
                        }),
                        contractFile,
                      );
                      setContractFile(null);
                      setContractForm(createContractDraft(data.events[0]?.id));
                    },
                    t('clientDetail.contractCreated'),
                  )
                }
              />
              {data.contracts.length ? (
                data.contracts.map((contract) => (
                  <View key={contract.id} style={styles.inlineCard}>
                    <Text style={styles.rowTitle}>{contract.version?.fileName ?? t('clientDetail.noContractPdf')}</Text>
                    <Text style={styles.rowCaption}>
                      {contract.versions.length} vers{contract.versions.length === 1 ? 'ão' : 'ões'} •{' '}
                      {contract.signedAt ? `${t('common.signedAt')} ${formatDate(contract.signedAt)}` : t('clientDetail.waitingManualAction')}
                    </Text>
                    <View style={styles.choiceRow}>
                      {contractStatusOptions.map((option) => (
                        <Pressable
                          key={`${contract.id}-${option.value}`}
                          style={[
                            styles.choiceChip,
                            contract.status === option.value ? styles.choiceChipActive : null,
                          ]}
                          onPress={() =>
                            void runAction(
                              `contract-status-${contract.id}-${option.value}`,
                              async () => {
                                await updateContractStatus(mobileSupabaseClient!, contract.id, {
                                  status: option.value,
                                  signedAt:
                                    option.value === 'signed' ? new Date().toISOString() : undefined,
                                });
                              },
                              t('clientDetail.contractStatusUpdated'),
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              contract.status === option.value ? styles.choiceChipTextActive : null,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.actionRow}>
                      <ActionButton
                        label={t('common.openPdf')}
                        onPress={() => {
                          if (!contract.version?.storagePath) {
                            setActionError(t('clientDetail.contracts.missingPdf'));
                            return;
                          }

                          void openFile(
                            'contracts',
                            contract.version.storagePath,
                            t('clientDetail.contracts.openPdf'),
                          );
                        }}
                        variant="secondary"
                      />
                      <ActionButton
                        label={t('common.newVersion')}
                        onPress={() =>
                          void (async () => {
                            const file = await pickSingleFile(['application/pdf', '.pdf']);
                            if (!file) {
                              return;
                            }

                            await runAction(
                              `contract-version-${contract.id}`,
                              async () => {
                                await uploadContractVersion(mobileSupabaseClient!, contract.id, file);
                              },
                              t('clientDetail.contractVersionUploaded'),
                            );
                          })()
                        }
                        variant="secondary"
                      />
                    </View>
                  </View>
                ))
              ) : (
                <EmptyCard
                  title={t('clientDetail.noContractsTitle')}
                  description={t('clientDetail.noContractsDescription')}
                />
              )}
            </View>
          </SectionCard>

          <SectionCard title={t('clientDetail.assetsTitle')} description={t('clientDetail.assetsDescription')}>
            <View style={styles.cardBody}>
              <ChoiceField
                label={t('common.linkEvent')}
                value={assetEventId ?? ''}
                options={[
                  { label: t('common.noSpecificEvent'), value: '' },
                  ...eventOptions.map((eventOption) => ({
                    label: eventOption.label,
                    value: eventOption.id,
                  })),
                ]}
                onChange={(value) => setAssetEventId(value || undefined)}
              />
              <MobileField
                label={t('common.caption')}
                value={assetCaption}
                onChangeText={setAssetCaption}
              />
              <ActionButton
                label={assetFile ? `${t('common.file')}: ${assetFile.fileName}` : t('clientDetail.selectAsset')}
                onPress={() =>
                  void (async () => {
                    const file = await pickSingleFile(['image/*', 'application/pdf', '.pdf']);
                    if (file) {
                      setAssetFile(file);
                    }
                  })()
                }
                variant="secondary"
              />
              {assetFile ? (
                <View style={styles.inlineCard}>
                  {assetFile.contentType.startsWith('image/') ? (
                    <Image source={{ uri: assetFile.uri }} style={styles.imagePreview} />
                  ) : null}
                  <Text style={styles.rowTitle}>{assetFile.fileName}</Text>
                  <Text style={styles.rowCaption}>
                    {assetFile.contentType} • {formatFileSize(assetFile.sizeBytes)}
                  </Text>
                </View>
              ) : null}
              <ActionButton
                label={busyAction === 'upload-asset' ? t('common.processing') : t('clientDetail.sendFile')}
                onPress={() =>
                  void runAction(
                    'upload-asset',
                    async () => {
                      if (!assetFile) {
                        throw new Error(t('clientDetail.assets.selectFile'));
                      }

                      await uploadClientAsset(
                        mobileSupabaseClient!,
                        {
                          clientId,
                          eventId: assetEventId,
                          caption: assetCaption || undefined,
                        },
                        assetFile,
                      );
                      setAssetCaption('');
                      setAssetEventId(undefined);
                      setAssetFile(null);
                    },
                    t('clientDetail.assetUploaded'),
                  )
                }
              />
              {data.media.length ? (
                data.media.map((media) => (
                  <RemoteMediaCard
                    key={media.id}
                    title={media.fileName}
                    subtitle={`${media.caption ?? t('clientDetail.assets.noCaption')} • ${formatFileSize(media.sizeBytes)}`}
                    bucket="client-media"
                    path={media.storagePath}
                    isImage
                    onOpen={() =>
                      openFile('client-media', media.storagePath, t('clientDetail.fileOpened'))
                    }
                  />
                ))
              ) : null}
              {data.documents
                .filter((document) => document.documentType !== 'contract')
                .map((document) => (
                  <RemoteMediaCard
                    key={document.id}
                    title={document.fileName}
                    subtitle={`${document.mimeType} • ${formatFileSize(document.fileSizeBytes)}`}
                    bucket={resolveDocumentBucket(document)}
                    path={document.storagePath}
                    onOpen={() =>
                      openFile(
                        resolveDocumentBucket(document),
                        document.storagePath,
                        t('clientDetail.fileOpened'),
                      )
                    }
                  />
                ))}
              {!data.media.length && !data.documents.filter((document) => document.documentType !== 'contract').length ? (
                <EmptyCard
                  title={t('clientDetail.noFilesTitle')}
                  description={t('clientDetail.noFilesDescription')}
                />
              ) : null}
            </View>
          </SectionCard>
        </>
      )}
    </ScreenShell>
  );
}

function AgendaScreen({
  activeTab,
  onChangeTab,
}: {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
}) {
  const { t, formatDateTime, appointmentStatusLabel } = useI18n();
  const [period, setPeriod] = useState<'today' | 'next7' | 'all'>('today');
  const [status, setStatus] = useState<
    'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  >('all');
  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'all') {
      return {
        from: undefined,
        to: undefined,
      };
    }

    const end = new Date(start);
    end.setDate(end.getDate() + (period === 'today' ? 1 : 7));

    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  }, [period]);

  const { data, loading, error } = useAppointments(mobileSupabaseClient, {
    status: status === 'all' ? undefined : status,
    from: range.from,
    to: range.to,
    orderDirection: 'asc',
  });
  const localizedAgendaFilterOptions = useMemo(
    () => [
      { label: t('agenda.period.today'), value: 'today' as const },
      { label: t('agenda.period.next7'), value: 'next7' as const },
      { label: t('agenda.period.all'), value: 'all' as const },
    ],
    [t],
  );
  const localizedAppointmentStatusOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'all' as const },
      { label: appointmentStatusLabel('scheduled'), value: 'scheduled' as const },
      { label: appointmentStatusLabel('confirmed'), value: 'confirmed' as const },
      { label: appointmentStatusLabel('completed'), value: 'completed' as const },
      { label: appointmentStatusLabel('cancelled'), value: 'cancelled' as const },
      { label: appointmentStatusLabel('no_show'), value: 'no_show' as const },
    ],
    [appointmentStatusLabel, t],
  );

  return (
    <ScreenShell
      title={t('agenda.title')}
      subtitle="Compromissos reais com filtro mínimo por período e status."
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      <SectionCard title="Filtros" description="Visão rápida para hoje, 7 dias ou tudo.">
        <ChoiceField label={t('agenda.period')} value={period} options={localizedAgendaFilterOptions} onChange={setPeriod} />
        <ChoiceField
          label={t('agenda.status')}
          value={status}
          options={localizedAppointmentStatusOptions}
          onChange={(value) => setStatus(value)}
        />
      </SectionCard>

      {error ? <FeedbackCard tone="error" message={error} /> : null}

      <SectionCard title={t('dashboard.nextAppointments')} description={t('agenda.cardDescription')}>
        {loading ? (
          <Text style={styles.helperText}>Carregando agenda...</Text>
        ) : data?.length ? (
          data.map((appointment) => (
            <View key={appointment.id} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{appointment.title}</Text>
                <Text style={styles.rowSubtitle}>{formatDateTime(appointment.startsAt)}</Text>
                <Text style={styles.rowCaption}>{appointment.location ?? t('common.noLocation')}</Text>
              </View>
              <Pill tone={appointment.status === 'confirmed' ? 'success' : 'accent'}>
                {appointmentStatusLabel(appointment.status)}
              </Pill>
            </View>
          ))
        ) : (
          <EmptyCard
            title={t('agenda.emptyTitle')}
            description={t('agenda.emptyDescription')}
          />
        )}
      </SectionCard>
    </ScreenShell>
  );
}

function NotificationsScreen({
  activeTab,
  onChangeTab,
  onSignOut,
  professional,
}: {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  onSignOut: () => Promise<void>;
  professional: Professional;
}) {
  const { t } = useI18n();
  const { data } = useDashboardSummary(mobileSupabaseClient);

  return (
    <ScreenShell
      title={t('mobile.notificationsTitle')}
      subtitle={`Sessão ativa como ${professional.fullName}.`}
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      <SectionCard title="Fila de atenção" description="Sinais operacionais que pedem ação manual.">
        <View style={styles.timelineItem}>
          <Text style={styles.rowTitle}>Orçamentos aguardando resposta</Text>
          <Text style={styles.rowCaption}>
            {data?.pendingBudgets ?? 0} proposta(s) precisam de follow-up nas próximas 24h.
          </Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.rowTitle}>Clientes em destaque</Text>
          <Text style={styles.rowCaption}>
            {data?.topClients.map((client) => client.fullName).join(', ') ||
              'Nenhuma cliente crítica agora.'}
          </Text>
        </View>
        <ActionButton label={t('workspace.signOut')} onPress={() => void onSignOut()} variant="secondary" />
      </SectionCard>
    </ScreenShell>
  );
}

function ChoiceField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<ChoiceOption<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.mobileField}>
      <Text style={styles.mobileFieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => (
          <Pressable
            key={`${label}-${option.value}`}
            onPress={() => onChange(option.value)}
            style={[
              styles.choiceChip,
              option.value === value ? styles.choiceChipActive : null,
            ]}
          >
            <Text
              style={[
                styles.choiceChipText,
                option.value === value ? styles.choiceChipTextActive : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FileSummaryCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.inlineCard}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowCaption}>{subtitle}</Text>
    </View>
  );
}

function RemoteMediaCard({
  title,
  subtitle,
  bucket,
  path,
  isImage = false,
  onOpen,
}: {
  title: string;
  subtitle: string;
  bucket: 'client-media' | 'contracts' | 'documents';
  path: string;
  isImage?: boolean;
  onOpen: () => Promise<void>;
}) {
  const { url } = useSignedStorageUrl(mobileSupabaseClient, bucket, path);

  return (
    <Pressable style={styles.inlineCard} onPress={() => void onOpen()}>
      {isImage && url ? (
        <Image source={{ uri: url, cache: 'force-cache' }} style={styles.imagePreview} />
      ) : null}
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowCaption}>{subtitle}</Text>
      <Text style={styles.linkText}>Abrir arquivo</Text>
    </Pressable>
  );
}

function MobileField({
  label,
  multiline,
  ...props
}: {
  label: string;
  multiline?: boolean;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.mobileField}>
      <Text style={styles.mobileFieldLabel}>{label}</Text>
      <TextInput
        {...props}
        autoCapitalize="none"
        multiline={multiline}
        style={[styles.mobileFieldInput, multiline ? styles.mobileFieldTextarea : null]}
        placeholderTextColor={colors.inkSoft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    gap: 12,
  },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  rowCaption: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  timelineItem: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 6,
  },
  timelineDate: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
  mobileField: {
    gap: 8,
  },
  mobileFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  mobileFieldInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
  },
  mobileFieldTextarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  cardBody: {
    gap: 12,
  },
  inlineCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 8,
  },
  chatBubble: {
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  chatBubbleInbound: {
    backgroundColor: colors.surfaceMuted,
  },
  chatBubbleOutbound: {
    backgroundColor: colors.ink,
  },
  chatTextInverted: {
    color: colors.surface,
  },
  chatTextMutedInverted: {
    color: '#d6d3d1',
  },
  chatErrorText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#fecaca',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  choiceChipTextActive: {
    color: colors.surface,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
});
