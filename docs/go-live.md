# Go-Live Controlado

Este documento consolida o fluxo de abertura controlada da AURA para piloto assistido.

## Pré-requisitos

- `staging-validation` verde no GitHub Actions.
- Webhook configurado na Meta com `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- `WHATSAPP_ACCESS_TOKEN` válido e template aprovado vinculado no staging.
- `AUTOMATION_JOB_SECRET` e `AURA_AUTOMATION_DISPATCH_URL` configurados.
- Observabilidade externa ativa em web, mobile e Edge Functions.
- E2E rodando sem `skip` com `E2E_*` preenchidos.

## Go/No-Go

- `typecheck`, `lint`, `test` e `build` verdes.
- Pelo menos um envio de template confirmado no staging.
- Pelo menos um inbound real ou evidência explícita do bloqueio externo.
- Logs de `integration_logs`, `message_status_events` e `automation_dispatch_runs` visíveis.
- Mobile validado manualmente em simulador ou dispositivo.

## Sequência recomendada

1. Confirmar secrets do staging.
2. Rodar `corepack pnpm -r typecheck`.
3. Rodar `corepack pnpm -r lint`.
4. Rodar `corepack pnpm test`.
5. Rodar `corepack pnpm --filter @aura/web build`.
6. Rodar `corepack pnpm test:e2e`.
7. Executar o workflow `Staging Validation`.
8. Validar template outbound real.
9. Validar inbound real.
10. Verificar eventos de status e automações.
11. Registrar resultado em [validation-evidence.md](C:/dev/aura/docs/validation-evidence.md).

## Rollback

- Desativar o webhook na Meta se houver falha sistêmica de processamento.
- Pausar o workflow/scheduler manualmente no GitHub.
- Revogar temporariamente templates operacionais na UI se o opt-in estiver inconsistente.
- Reverter a release web/mobile para a versão imediatamente anterior se a falha atingir operação básica.

## Monitoramento inicial

- Erros de Edge Function por função: `whatsapp-webhook`, `whatsapp-send`, `automation-dispatch`.
- Taxa de mensagens `failed`.
- Ausência de `statusEvents` após envio.
- Crescimento anormal de `notification_logs` com falha.
- Incidentes de idioma misto nas telas do detalhe da cliente.
