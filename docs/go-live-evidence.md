# Evidências de Go-Live

Use este documento para registrar a primeira abertura assistida do piloto com dados reais.

## Identificação

- data:
- ambiente:
- release:
- responsável:
- tenant validado:
- cliente usada no fluxo:

## Pré-condições confirmadas

- [ ] webhook configurado na Meta
- [ ] templates aprovados e mapeados
- [ ] scheduler ativo
- [ ] observabilidade externa ativa
- [ ] `staging-validation` verde
- [ ] `test:e2e` sem `skip`
- [ ] validação mobile executada

## Evidências do fluxo real

- [ ] `hub.challenge` validado
- [ ] template outbound enviado
- [ ] mensagem inbound recebida
- [ ] status outbound persistido
- [ ] conversa associada à cliente correta
- [ ] logs em `integration_logs`
- [ ] evento em `automation_dispatch_runs` quando aplicável

## Resultado

- status:
  - [ ] aprovado
  - [ ] aprovado com ressalvas
  - [ ] bloqueado

- observações:

## Bloqueios remanescentes

- descrição:
- classificação:
  - [ ] técnico
  - [ ] operacional
  - [ ] externo
- próximo passo:
