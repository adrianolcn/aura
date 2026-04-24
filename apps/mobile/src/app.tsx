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
  formatCurrency,
  formatDate,
  formatDateTime,
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

const agendaFilterOptions: Array<ChoiceOption<'today' | 'next7' | 'all'>> = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: 'next7' },
  { label: 'Tudo', value: 'all' },
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
        <ScreenShell title="AURA mobile" subtitle="Carregando sessão e restaurando o workspace.">
          <SectionCard title="Inicializando" description="Conectando ao Supabase e preparando a operação real." />
        </ScreenShell>
      </SafeAreaProvider>
    );
  }

  if (!mobileSupabaseClient) {
    return (
      <SafeAreaProvider>
        <ScreenShell title="AURA mobile" subtitle="Auth real requer configuração do Supabase.">
          <SectionCard
            title="Configuração pendente"
            description="Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY para habilitar login real no mobile."
          />
        </ScreenShell>
      </SafeAreaProvider>
    );
  }

  const supabaseClient = mobileSupabaseClient;

  if (!authState.professional) {
    return (
      <SafeAreaProvider>
        <LoginScreen
          onAuthenticated={async () => {
            const auth = await getAuthState(supabaseClient);
            setAuthState({
              loading: false,
              professional: auth.professional,
            });
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const supabaseClient = mobileSupabaseClient;
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
          setMessage('Conta criada. Confirme o email para concluir o acesso.');
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
      title="AURA mobile"
      subtitle="Acesso real ao núcleo operacional da agenda, clientes, orçamentos, contratos e arquivos."
    >
      <SectionCard
        title={mode === 'sign-in' ? 'Entrar' : 'Criar conta'}
        description="Sessão persistida no dispositivo com segregação multi-tenant por profissional."
      >
        {mode === 'sign-up' ? (
          <>
            <MobileField
              label="Nome completo"
              value={signUpData.fullName}
              onChangeText={(value) => setSignUpData((current) => ({ ...current, fullName: value }))}
            />
            <MobileField
              label="Negócio"
              value={signUpData.businessName}
              onChangeText={(value) =>
                setSignUpData((current) => ({ ...current, businessName: value }))
              }
            />
            <MobileField
              label="Telefone"
              value={signUpData.phone}
              onChangeText={(value) => setSignUpData((current) => ({ ...current, phone: value }))}
            />
          </>
        ) : null}

        <MobileField
          label="Email"
          value={mode === 'sign-in' ? signInData.email : signUpData.email}
          onChangeText={(value) =>
            mode === 'sign-in'
              ? setSignInData((current) => ({ ...current, email: value }))
              : setSignUpData((current) => ({ ...current, email: value }))
          }
          keyboardType="email-address"
        />
        <MobileField
          label="Senha"
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
          label={loading ? 'Processando...' : mode === 'sign-in' ? 'Entrar' : 'Criar conta'}
          onPress={() => void handleAuth()}
        />
        <ActionButton
          label={mode === 'sign-in' ? 'Criar conta' : 'Já tenho conta'}
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
  const { data, loading, error } = useDashboardSummary(mobileSupabaseClient);

  return (
    <ScreenShell
      title="Resumo do dia"
      subtitle={`${professional.businessName} • tenant pronto para operação real.`}
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      {error ? <FeedbackCard tone="error" message={error} /> : null}

      <View style={styles.metricGrid}>
        <MetricCard
          label="Clientes ativas"
          value={String(data?.activeClients ?? 0)}
          helper="Carteira persistida por profissional."
        />
        <MetricCard
          label="Pipeline"
          value={formatCurrency(data?.revenuePipeline ?? 0)}
          helper="Receita potencial em negociação."
        />
      </View>

      <SectionCard title="Próximos compromissos" description="Agenda real puxada do Supabase.">
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
                {appointment.status}
              </Pill>
            </View>
          ))
        ) : (
          <EmptyCard
            title="Nenhum compromisso próximo"
            description="Quando houver novos agendamentos, eles aparecem aqui."
          />
        )}
      </SectionCard>

      <SectionCard title="Clientes prioritárias" description="Carteira com score operacional.">
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
      setMessage('Cliente criada com sucesso.');
      reload();
    } catch (reason) {
      setActionError(toUserMessage(reason, 'Não foi possível salvar a cliente.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell
      title="Clientes"
      subtitle="Busca real por nome ou telefone, cadastro e acesso ao detalhe operacional."
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      <SectionCard title="Busca rápida" description="Nome e telefone são os atalhos principais da operação.">
        <MobileField
          label="Buscar cliente"
          value={search}
          onChangeText={setSearch}
          placeholder="Nome ou telefone"
        />
      </SectionCard>

      {error ? <FeedbackCard tone="error" message={error} /> : null}
      {actionError ? <FeedbackCard tone="error" message={actionError} /> : null}
      {message ? <FeedbackCard tone="success" message={message} /> : null}

      <SectionCard
        title="Nova cliente"
        description="Cadastro persistido no Supabase com validação compartilhada por Zod."
      >
        {showCreate ? (
          <View style={styles.cardBody}>
            <MobileField
              label="Nome completo"
              value={clientForm.fullName}
              onChangeText={(value) => setClientForm((current) => ({ ...current, fullName: value }))}
            />
            <MobileField
              label="Telefone"
              value={clientForm.phone}
              onChangeText={(value) => setClientForm((current) => ({ ...current, phone: value }))}
            />
            <MobileField
              label="Email"
              value={clientForm.email ?? ''}
              onChangeText={(value) => setClientForm((current) => ({ ...current, email: value }))}
              keyboardType="email-address"
            />
            <MobileField
              label="Cidade"
              value={clientForm.city ?? ''}
              onChangeText={(value) => setClientForm((current) => ({ ...current, city: value }))}
            />
            <MobileField
              label="Instagram"
              value={clientForm.instagramHandle ?? ''}
              onChangeText={(value) =>
                setClientForm((current) => ({ ...current, instagramHandle: value }))
              }
            />
            <MobileField
              label="Score de prioridade"
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
              label="Etapa"
              value={clientForm.lifecycleStage}
              options={lifecycleStageOptions}
              onChange={(value) =>
                setClientForm((current) => ({ ...current, lifecycleStage: value }))
              }
            />
            <MobileField
              label="Observações"
              value={clientForm.notes ?? ''}
              onChangeText={(value) => setClientForm((current) => ({ ...current, notes: value }))}
              multiline
            />
            <ActionButton
              label={busy ? 'Salvando...' : 'Salvar cliente'}
              onPress={() => void handleCreateClient()}
            />
            <ActionButton
              label="Cancelar"
              onPress={() => setShowCreate(false)}
              variant="secondary"
            />
          </View>
        ) : (
          <ActionButton label="Cadastrar cliente" onPress={() => setShowCreate(true)} />
        )}
      </SectionCard>

      <SectionCard title="Carteira" description="Lista real com loading, vazio e erro tratados.">
        {loading ? (
          <Text style={styles.helperText}>Carregando clientes...</Text>
        ) : data?.length ? (
          <View style={styles.cardBody}>
            {data.map((item) => (
              <Pressable key={item.id} onPress={() => onOpenClient(item.id)} style={styles.rowCard}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{item.fullName}</Text>
                  <Text style={styles.rowSubtitle}>{item.phone}</Text>
                  <Text style={styles.rowCaption}>{item.city ?? 'Cidade não informada'}</Text>
                </View>
                <Pill tone={item.lifecycleStage === 'confirmed' ? 'success' : 'accent'}>
                  {item.lifecycleStage}
                </Pill>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyCard
            title="Nenhuma cliente encontrada"
            description="Ajuste a busca ou crie a primeira cliente para começar a operar no mobile."
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
    [data?.events],
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
        setActionError(toUserMessage(reason, 'Não foi possível concluir a ação.'));
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, clientId, reload, reloadCommunication],
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
        setActionError(toUserMessage(reason, 'Não foi possível abrir o arquivo.'));
      }
    },
    [clientId],
  );

  return (
    <ScreenShell
      title={data?.client.fullName ?? 'Cliente'}
      subtitle="Resumo, timeline, agenda, orçamento, contratos e arquivos reais no dispositivo."
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      <ActionButton label="Voltar para clientes" onPress={onBack} variant="secondary" />

      {error ? <FeedbackCard tone="error" message={error} /> : null}
      {communicationError ? <FeedbackCard tone="error" message={communicationError} /> : null}
      {actionError ? <FeedbackCard tone="error" message={actionError} /> : null}
      {message ? <FeedbackCard tone="success" message={message} /> : null}

      {loading || communicationLoading || !data || !communicationData ? (
        <SectionCard title="Carregando" description="Buscando o workspace completo da cliente." />
      ) : (
        <>
          <View style={styles.metricGrid}>
            <MetricCard
              label="Eventos"
              value={String(data.events.length)}
              helper="Eventos persistidos por cliente."
            />
            <MetricCard
              label="Contratos"
              value={String(data.contracts.length)}
              helper="PDFs versionados no Storage."
            />
          </View>

          <SectionCard title="Resumo" description="Dados centrais da cliente com edição real.">
            <View style={styles.cardBody}>
              <MobileField
                label="Nome completo"
                value={clientForm.fullName}
                onChangeText={(value) => setClientForm((current) => ({ ...current, fullName: value }))}
              />
              <MobileField
                label="Telefone"
                value={clientForm.phone}
                onChangeText={(value) => setClientForm((current) => ({ ...current, phone: value }))}
              />
              <MobileField
                label="Email"
                value={clientForm.email ?? ''}
                onChangeText={(value) => setClientForm((current) => ({ ...current, email: value }))}
                keyboardType="email-address"
              />
              <MobileField
                label="Cidade"
                value={clientForm.city ?? ''}
                onChangeText={(value) => setClientForm((current) => ({ ...current, city: value }))}
              />
              <MobileField
                label="Instagram"
                value={clientForm.instagramHandle ?? ''}
                onChangeText={(value) =>
                  setClientForm((current) => ({ ...current, instagramHandle: value }))
                }
              />
              <MobileField
                label="Score de prioridade"
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
                label="Etapa"
                value={clientForm.lifecycleStage}
                options={lifecycleStageOptions}
                onChange={(value) =>
                  setClientForm((current) => ({ ...current, lifecycleStage: value }))
                }
              />
              <MobileField
                label="Observações"
                value={clientForm.notes ?? ''}
                onChangeText={(value) => setClientForm((current) => ({ ...current, notes: value }))}
                multiline
              />
              <ActionButton
                label={busyAction === 'save-client' ? 'Salvando...' : 'Salvar cliente'}
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
                    'Cliente atualizada com sucesso.',
                  )
                }
              />
            </View>
          </SectionCard>

          <SectionCard title="Timeline" description="Linha do tempo real e ordenada da cliente.">
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
                title="Timeline vazia"
                description="Quando você criar eventos, orçamentos, contratos ou uploads, o histórico aparece aqui."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Conversa"
            description="Inbox operacional com histórico persistido, opt-in, templates aprovados e respostas livres dentro da janela do WhatsApp."
          >
            <View style={styles.cardBody}>
              <View style={styles.inlineCard}>
                <View style={styles.rowCard}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Consentimento WhatsApp</Text>
                    <Text style={styles.rowCaption}>
                      {communicationData.optIn
                        ? `Status ${communicationData.optIn.status} • origem ${communicationData.optIn.source}`
                        : 'Nenhum opt-in registrado ainda.'}
                    </Text>
                  </View>
                  <Pill tone={communicationData.optIn?.status === 'opted_in' ? 'success' : 'warning'}>
                    {communicationData.optIn?.status ?? 'pendente'}
                  </Pill>
                </View>
                <Text style={styles.rowCaption}>
                  {communicationData.optIn?.grantedAt
                    ? `Concedido em ${formatDateTime(communicationData.optIn.grantedAt)}`
                    : 'Registre o consentimento antes de disparar templates operacionais e automações.'}
                </Text>
                <View style={styles.actionRow}>
                  <ActionButton
                    label={busyAction === 'opt-in' ? 'Salvando...' : 'Registrar opt-in'}
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
                        'Opt-in registrado com sucesso.',
                      )
                    }
                  />
                  <ActionButton
                    label={busyAction === 'opt-out' ? 'Atualizando...' : 'Revogar'}
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
                        'Consentimento revogado com sucesso.',
                      )
                    }
                    variant="secondary"
                  />
                </View>
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>
                  {conversationWindow.status === 'open'
                    ? 'Janela de atendimento aberta'
                    : conversationWindow.status === 'expired'
                      ? 'Janela de atendimento expirada'
                      : 'Janela de atendimento indisponível'}
                </Text>
                <Text style={styles.rowCaption}>{conversationWindow.helperText}</Text>
                <Text style={styles.timelineDate}>Sincronizacao automatica a cada 15 segundos.</Text>
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>Template operacional</Text>
                <Text style={styles.rowCaption}>
                  Use template aprovado para iniciar conversa fora da janela de 24h ou para fluxos operacionais governados.
                </Text>
                {communicationData.templates.length ? (
                  <>
                    <ChoiceField
                      label="Template"
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
                          {selectedTemplate.externalTemplateName ?? 'Mapeamento pendente'}
                        </Text>
                        <Text style={styles.rowCaption}>{selectedTemplate.body}</Text>
                        <Text style={styles.timelineDate}>
                          {selectedTemplate.requiresOptIn
                            ? 'Exige opt-in'
                            : 'Sem opt-in obrigatório'}
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
                        message="Este template exige opt-in válido antes do envio."
                      />
                    ) : null}
                    <ActionButton
                      label={busyAction === 'send-template' ? 'Enviando...' : 'Enviar template'}
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
                                'Selecione um template válido e confirme o opt-in antes do envio.',
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
                          'Template enviado com sucesso.',
                        )
                      }
                    />
                  </>
                ) : (
                  <EmptyCard
                    title="Sem templates ativos"
                    description="Cadastre um template aprovado no WhatsApp para habilitar mensagens iniciadas pela empresa."
                  />
                )}
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>Responder cliente</Text>
                <Text style={styles.rowCaption}>
                  Texto livre só fica disponível enquanto a janela de atendimento estiver aberta.
                </Text>
                <MobileField
                  label="Mensagem"
                  value={messageBody}
                  onChangeText={setMessageBody}
                  multiline
                  placeholder={
                    conversationWindow.canSendFreeText
                      ? 'Digite uma resposta operacional ou contextual.'
                      : 'Fora da janela de 24h, use um template aprovado.'
                  }
                />
                <ActionButton
                  label={busyAction === 'send-text' ? 'Enviando...' : 'Enviar resposta'}
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
                            'A janela de atendimento expirou. Use um template aprovado para iniciar a conversa.',
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
                      'Resposta enviada com sucesso.',
                    )
                  }
                  variant={conversationWindow.canSendFreeText ? 'primary' : 'secondary'}
                />
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>Histórico</Text>
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
                              ? conversationMessage.templateName ?? 'Template operacional'
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
                          {conversationMessage.status}
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
                              ? 'Reenviando...'
                              : 'Reenviar'
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
                              'Mensagem reenviada com sucesso.',
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
                    title="Nenhuma conversa registrada"
                    description="Quando a cliente responder ou você enviar um template, o histórico aparece aqui."
                  />
                )}
              </View>

              <View style={styles.inlineCard}>
                <Text style={styles.rowTitle}>Automações e scheduler</Text>
                <Text style={styles.rowCaption}>
                  Lembretes e follow-up operacionais com prevenção básica de duplicidade.
                </Text>
                <ActionButton
                  label={busyAction === 'dispatch-automation' ? 'Executando...' : 'Executar automações'}
                  disabled={Boolean(busyAction)}
                  onPress={() =>
                    void runAction(
                      'dispatch-automation',
                      async () => {
                        const result = await dispatchAutomationRules(mobileSupabaseClient!, {
                          clientId,
                        });
                        setMessage(
                          `${result.processedCount} automação(ões) processada(s), ${result.skippedCount} pulada(s) e ${result.failedCount} falha(s).`,
                        );
                      },
                      'Automações executadas.',
                    )
                  }
                  variant="secondary"
                />
                {communicationData.notificationLogs.map((entry) => (
                  <View key={entry.id} style={styles.timelineItem}>
                    <Text style={styles.rowTitle}>{entry.executionKind}</Text>
                    <Text style={styles.rowCaption}>
                      {entry.errorMessage ?? `Agendado para ${formatDateTime(entry.scheduledFor)}`}
                    </Text>
                  </View>
                ))}
                {communicationData.dispatchRuns.map((entry) => (
                  <View key={entry.id} style={styles.timelineItem}>
                    <Text style={styles.rowTitle}>
                      {entry.triggerSource} • {entry.status}
                    </Text>
                    <Text style={styles.rowCaption}>
                      {entry.processedCount} processada(s), {entry.skippedCount} pulada(s),{' '}
                      {entry.failedCount} falha(s)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Eventos" description="Criação básica de evento com persistência real.">
            <View style={styles.cardBody}>
              <MobileField
                label="Título"
                value={eventForm.title}
                onChangeText={(value) => setEventForm((current) => ({ ...current, title: value }))}
              />
              <MobileField
                label="Tipo de evento"
                value={eventForm.eventType}
                onChangeText={(value) =>
                  setEventForm((current) => ({ ...current, eventType: value }))
                }
              />
              <MobileField
                label="Local"
                value={eventForm.location ?? ''}
                onChangeText={(value) => setEventForm((current) => ({ ...current, location: value }))}
              />
              <DateTimeField
                label="Data e hora do evento"
                value={eventForm.eventDate}
                onChange={(nextValue) =>
                  setEventForm((current) => ({
                    ...current,
                    eventDate: nextValue ?? current.eventDate,
                  }))
                }
              />
              <ChoiceField
                label="Status"
                value={eventForm.status}
                options={eventStatusOptions}
                onChange={(value) => setEventForm((current) => ({ ...current, status: value }))}
              />
              <MobileField
                label="Convidadas"
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
                label="Observações"
                value={eventForm.notes ?? ''}
                onChangeText={(value) => setEventForm((current) => ({ ...current, notes: value }))}
                multiline
              />
              <ActionButton
                label={busyAction === 'create-event' ? 'Salvando...' : 'Criar evento'}
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
                    'Evento criado com sucesso.',
                  )
                }
              />
              {data.events.length ? (
                data.events.map((eventItem) => (
                  <View key={eventItem.id} style={styles.rowCard}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{eventItem.title}</Text>
                      <Text style={styles.rowSubtitle}>{formatDateTime(eventItem.eventDate)}</Text>
                      <Text style={styles.rowCaption}>{eventItem.location ?? 'Sem local informado'}</Text>
                    </View>
                    <Pill tone={eventItem.status === 'booked' ? 'success' : 'accent'}>
                      {eventItem.status}
                    </Pill>
                  </View>
                ))
              ) : (
                <EmptyCard
                  title="Nenhum evento criado"
                  description="Crie o primeiro evento para liberar orçamento, agenda e contratos."
                />
              )}
            </View>
          </SectionCard>

          <SectionCard title="Agenda" description="Agendamento básico com vínculo opcional ao evento.">
            <View style={styles.cardBody}>
              <MobileField
                label="Título"
                value={appointmentForm.title}
                onChangeText={(value) =>
                  setAppointmentForm((current) => ({ ...current, title: value }))
                }
              />
              <ChoiceField
                label="Tipo"
                value={appointmentForm.appointmentType}
                options={appointmentTypeOptions}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, appointmentType: value }))
                }
              />
              <ChoiceField
                label="Status"
                value={appointmentForm.status}
                options={appointmentStatusOptions}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, status: value }))
                }
              />
              <ChoiceField
                label="Vincular ao evento"
                value={appointmentForm.eventId ?? ''}
                options={[
                  { label: 'Sem vínculo', value: '' },
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
                label="Início"
                value={appointmentForm.startsAt}
                onChange={(nextValue) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    startsAt: nextValue ?? current.startsAt,
                  }))
                }
              />
              <DateTimeField
                label="Fim"
                value={appointmentForm.endsAt}
                onChange={(nextValue) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    endsAt: nextValue ?? current.endsAt,
                  }))
                }
              />
              <MobileField
                label="Local"
                value={appointmentForm.location ?? ''}
                onChangeText={(value) =>
                  setAppointmentForm((current) => ({ ...current, location: value }))
                }
              />
              <MobileField
                label="Observações"
                value={appointmentForm.notes ?? ''}
                onChangeText={(value) =>
                  setAppointmentForm((current) => ({ ...current, notes: value }))
                }
                multiline
              />
              <ActionButton
                label={busyAction === 'create-appointment' ? 'Salvando...' : 'Criar agendamento'}
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
                    'Agendamento criado com sucesso.',
                  )
                }
              />
              {data.appointments.length ? (
                data.appointments.map((appointment) => (
                  <View key={appointment.id} style={styles.rowCard}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{appointment.title}</Text>
                      <Text style={styles.rowSubtitle}>{formatDateTime(appointment.startsAt)}</Text>
                      <Text style={styles.rowCaption}>{appointment.location ?? 'Sem local informado'}</Text>
                    </View>
                    <Pill tone={appointment.status === 'confirmed' ? 'success' : 'accent'}>
                      {appointment.status}
                    </Pill>
                  </View>
                ))
              ) : (
                <EmptyCard
                  title="Nenhum agendamento"
                  description="Crie compromissos para organizar o dia da cliente e o próximo passo do atendimento."
                />
              )}
            </View>
          </SectionCard>

          <SectionCard title="Orçamentos" description="Criação básica de proposta com itens reais.">
            <View style={styles.cardBody}>
              <ChoiceField
                label="Evento"
                value={budgetForm.eventId}
                options={eventOptions.map((eventOption) => ({
                  label: eventOption.label,
                  value: eventOption.id,
                }))}
                onChange={(value) => setBudgetForm((current) => ({ ...current, eventId: value }))}
              />
              <ChoiceField
                label="Status"
                value={budgetForm.status}
                options={budgetStatusOptions}
                onChange={(value) => setBudgetForm((current) => ({ ...current, status: value }))}
              />
              <DateTimeField
                label="Validade"
                value={budgetForm.validUntil || undefined}
                onChange={(nextValue) =>
                  setBudgetForm((current) => ({
                    ...current,
                    validUntil: nextValue ?? '',
                  }))
                }
              />
              <MobileField
                label="Desconto"
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
                    label={`Item ${index + 1}`}
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
                    label="Quantidade"
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
                    label="Preço unitário"
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
                label="Adicionar item"
                onPress={() =>
                  setBudgetForm((current) => ({
                    ...current,
                    items: [...current.items, { description: '', quantity: 1, unitPrice: 0 }],
                  }))
                }
                variant="secondary"
              />
              <ActionButton
                label={busyAction === 'create-budget' ? 'Salvando...' : 'Criar orçamento'}
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
                    'Orçamento criado com sucesso.',
                  )
                }
              />
              {data.budgets.length ? (
                data.budgets.map((budget) => (
                  <View key={budget.id} style={styles.rowCard}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{formatCurrency(budget.totalAmount)}</Text>
                      <Text style={styles.rowSubtitle}>
                        {budget.items.length} item(ns) • {budget.status}
                      </Text>
                      <Text style={styles.rowCaption}>
                        Validade {budget.validUntil ? formatDate(budget.validUntil) : 'aberta'}
                      </Text>
                    </View>
                    <Pill tone={budget.status === 'approved' ? 'success' : 'warning'}>
                      {budget.status}
                    </Pill>
                  </View>
                ))
              ) : (
                <EmptyCard
                  title="Nenhum orçamento"
                  description="Crie a primeira proposta para acompanhar negociação e valor."
                />
              )}
            </View>
          </SectionCard>

          <SectionCard title="Contratos" description="Criação de contrato, nova versão e abertura segura do PDF.">
            <View style={styles.cardBody}>
              <ChoiceField
                label="Evento"
                value={contractForm.eventId}
                options={eventOptions.map((eventOption) => ({
                  label: eventOption.label,
                  value: eventOption.id,
                }))}
                onChange={(value) => setContractForm((current) => ({ ...current, eventId: value }))}
              />
              <ChoiceField
                label="Status inicial"
                value={contractForm.status}
                options={contractStatusOptions}
                onChange={(value) => setContractForm((current) => ({ ...current, status: value }))}
              />
              <DateTimeField
                label="Assinado em"
                value={contractForm.signedAt || undefined}
                onChange={(nextValue) =>
                  setContractForm((current) => ({
                    ...current,
                    signedAt: nextValue ?? '',
                  }))
                }
              />
              <ActionButton
                label={contractFile ? `PDF: ${contractFile.fileName}` : 'Selecionar PDF do contrato'}
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
                label={busyAction === 'create-contract' ? 'Enviando...' : 'Criar contrato'}
                onPress={() =>
                  void runAction(
                    'create-contract',
                    async () => {
                      if (!contractFile) {
                        throw new Error('Selecione um PDF de contrato antes de salvar.');
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
                    'Contrato criado com sucesso.',
                  )
                }
              />
              {data.contracts.length ? (
                data.contracts.map((contract) => (
                  <View key={contract.id} style={styles.inlineCard}>
                    <Text style={styles.rowTitle}>{contract.version?.fileName ?? 'Contrato sem PDF'}</Text>
                    <Text style={styles.rowCaption}>
                      {contract.versions.length} vers{contract.versions.length === 1 ? 'ão' : 'ões'} •{' '}
                      {contract.signedAt ? `assinado em ${formatDate(contract.signedAt)}` : 'aguardando ação'}
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
                              'Status do contrato atualizado.',
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
                        label="Abrir PDF"
                        onPress={() => {
                          if (!contract.version?.storagePath) {
                            setActionError('Este contrato ainda não possui PDF disponível.');
                            return;
                          }

                          void openFile(
                            'contracts',
                            contract.version.storagePath,
                            'Contrato aberto no dispositivo.',
                          );
                        }}
                        variant="secondary"
                      />
                      <ActionButton
                        label="Nova versão"
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
                              'Nova versão do contrato enviada.',
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
                  title="Nenhum contrato"
                  description="Selecione um PDF e crie o primeiro contrato deste atendimento."
                />
              )}
            </View>
          </SectionCard>

          <SectionCard title="Arquivos" description="Upload real de imagens e PDFs com preview básico do arquivo selecionado.">
            <View style={styles.cardBody}>
              <ChoiceField
                label="Vincular ao evento"
                value={assetEventId ?? ''}
                options={[
                  { label: 'Sem vínculo', value: '' },
                  ...eventOptions.map((eventOption) => ({
                    label: eventOption.label,
                    value: eventOption.id,
                  })),
                ]}
                onChange={(value) => setAssetEventId(value || undefined)}
              />
              <MobileField
                label="Legenda"
                value={assetCaption}
                onChangeText={setAssetCaption}
              />
              <ActionButton
                label={assetFile ? `Arquivo: ${assetFile.fileName}` : 'Selecionar imagem ou PDF'}
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
                label={busyAction === 'upload-asset' ? 'Enviando...' : 'Enviar arquivo'}
                onPress={() =>
                  void runAction(
                    'upload-asset',
                    async () => {
                      if (!assetFile) {
                        throw new Error('Selecione um arquivo antes de enviar.');
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
                    'Arquivo enviado com sucesso.',
                  )
                }
              />
              {data.media.length ? (
                data.media.map((media) => (
                  <RemoteMediaCard
                    key={media.id}
                    title={media.fileName}
                    subtitle={`${media.caption ?? 'Sem legenda'} • ${formatFileSize(media.sizeBytes)}`}
                    bucket="client-media"
                    path={media.storagePath}
                    isImage
                    onOpen={() =>
                      openFile('client-media', media.storagePath, 'Imagem aberta no dispositivo.')
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
                        'Arquivo aberto no dispositivo.',
                      )
                    }
                  />
                ))}
              {!data.media.length && !data.documents.filter((document) => document.documentType !== 'contract').length ? (
                <EmptyCard
                  title="Nenhum arquivo anexado"
                  description="Envie imagens de referência ou PDFs para manter tudo no perfil da cliente."
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

  return (
    <ScreenShell
      title="Agenda do dia"
      subtitle="Compromissos reais com filtro mínimo por período e status."
      footer={<BottomNav activeTab={activeTab} onChange={(tab) => onChangeTab(tab as TabKey)} />}
    >
      <SectionCard title="Filtros" description="Visão rápida para hoje, 7 dias ou tudo.">
        <ChoiceField label="Período" value={period} options={agendaFilterOptions} onChange={setPeriod} />
        <ChoiceField
          label="Status"
          value={status}
          options={[
            { label: 'Todos', value: 'all' },
            ...appointmentStatusOptions,
          ]}
          onChange={(value) => setStatus(value)}
        />
      </SectionCard>

      {error ? <FeedbackCard tone="error" message={error} /> : null}

      <SectionCard title="Compromissos" description="Hoje e próximos passos relevantes.">
        {loading ? (
          <Text style={styles.helperText}>Carregando agenda...</Text>
        ) : data?.length ? (
          data.map((appointment) => (
            <View key={appointment.id} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{appointment.title}</Text>
                <Text style={styles.rowSubtitle}>{formatDateTime(appointment.startsAt)}</Text>
                <Text style={styles.rowCaption}>{appointment.location ?? 'Sem local'}</Text>
              </View>
              <Pill tone={appointment.status === 'confirmed' ? 'success' : 'accent'}>
                {appointment.status}
              </Pill>
            </View>
          ))
        ) : (
          <EmptyCard
            title="Agenda vazia"
            description="Nenhum compromisso corresponde aos filtros selecionados."
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
  const { data } = useDashboardSummary(mobileSupabaseClient);

  return (
    <ScreenShell
      title="Notificações internas"
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
        <ActionButton label="Sair da conta" onPress={() => void onSignOut()} variant="secondary" />
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
