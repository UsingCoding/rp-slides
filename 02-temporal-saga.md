---
theme: seriph
title: "Temporal: Saga и orchestration на Go"
info: |
  Распределённое программирование, 4 курс.
  Лекция 2. Temporal: реализация Saga и orchestration на Go.
colorSchema: light
aspectRatio: 16/9
canvasWidth: 1280
background: none
fonts:
  sans: Inter
  mono: JetBrains Mono
  weights: '400,600,700'
  italic: false
transition: none
mdc: true
layout: cover
---

# Temporal: Saga и orchestration на Go

Распределённое программирование · Лекция 2

<div class="abs-bl m-10 text-muted text-base">
  4 курс · 2026
</div>

---

# План лекции

<div class="grid grid-cols-2 gap-12">
<div>

1. От Saga к Temporal
2. Основные концепции
3. Архитектура и жизненный цикл
4. Интеграция в Go-приложение
5. Durable Execution и Replay

</div>
<div>

6. Saga на Temporal
7. Retry, timeout, ошибки
8. Взаимодействие с Workflow
9. Observability
10. Production и итоги

</div>
</div>

От самописного orchestrator — к durable execution.

---
src: ./lectures/02-temporal-saga/sections/01-from-saga.md
---

---
src: ./lectures/02-temporal-saga/sections/02-concepts.md
---

---
src: ./lectures/02-temporal-saga/sections/03-architecture.md
---

---
src: ./lectures/02-temporal-saga/sections/04-go-integration.md
---

---
src: ./lectures/02-temporal-saga/sections/05-durable-execution.md
---

---
src: ./lectures/02-temporal-saga/sections/06-saga.md
---

---
src: ./lectures/02-temporal-saga/sections/07-retry-timeout.md
---

---
src: ./lectures/02-temporal-saga/sections/08-interaction.md
---

---
src: ./lectures/02-temporal-saga/sections/09-observability.md
---

---
src: ./lectures/02-temporal-saga/sections/10-production.md
---
