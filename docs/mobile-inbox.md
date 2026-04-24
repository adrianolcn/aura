# Mobile Inbox

## Objetivo

Manter o mesmo comportamento central da inbox do web no app mobile.

## O que está alinhado

- regra de janela de 24h
- opt-in
- envio por template
- retry de falha
- automações manuais
- sincronização a cada 15s

## Arquivo principal

- [apps/mobile/src/app.tsx](C:/dev/aura/apps/mobile/src/app.tsx)

## Validação desta execução

Implementado:

- sincronização pragmática por polling
- retry visual de mensagem falha
- mesmo domínio compartilhado do web

Não validado em simulador/dispositivo neste ambiente:

- fluxo operacional manual em iOS/Android real
