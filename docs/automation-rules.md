# Automation Rules

## Scheduler real

Workflow:

- [/.github/workflows/automation-dispatch-schedule.yml](C:/dev/aura/.github/workflows/automation-dispatch-schedule.yml)

Secrets:

- `AURA_AUTOMATION_DISPATCH_URL`
- `AUTOMATION_JOB_SECRET`

## Auditoria

Cada rodada cria:

- `automation_dispatch_runs`
- `integration_logs` com `log_type = scheduler`
- `notification_logs` por tentativa elegível

## Reprocessamento

- use execução manual por cliente quando necessário
- gere nova `execution_key`
- revise `notification_logs` e `dispatchRuns` antes de reenfileirar

## Regras operacionais

- `appointment_confirmation`
- `appointment_reminder`
- `same_day_reminder`
- `trial_reminder`
- `day_before_guidance`
- `follow_up`
