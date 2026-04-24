# Pilot Runbook

## Go / No-Go

Go:

- webhook validado
- template real enviado
- inbound real recebido
- scheduler ativo
- observabilidade externa recebendo eventos
- E2E e suíte integrada verdes

No-Go:

- webhook não verificado
- templates não aprovados
- secrets ausentes
- scheduler sem execução auditável
- erro crítico de associação tenant/cliente

## Checklist de abertura

- confirmar secrets no GitHub
- confirmar envs no Supabase
- confirmar templates vinculados
- confirmar número de staging configurado
- confirmar `whatsapp_phone_number_id` no tenant
- confirmar opt-in do grupo piloto

## Validação diária

- checar `integration_logs`
- checar `automation_dispatch_runs`
- checar erros no provedor externo de observabilidade
- confirmar mensagens inbound do dia
- confirmar automações críticas processadas

## Rollback

- pausar workflow `Automation Dispatch Scheduler`
- remover webhook da Meta ou redirecionar para endpoint de fallback
- desativar templates/automations problemáticos
- comunicar operação assistida

## Reprocessamento controlado

- revisar `notification_logs`
- revisar `automation_dispatch_runs`
- rerodar manualmente `automation-dispatch` por cliente quando necessário
- não reaproveitar `execution_key` ao rerodar manualmente
