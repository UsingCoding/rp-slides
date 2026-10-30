---
theme: seriph
title: "Saga: распределённые бизнес-процессы"
info: |
  Распределённое программирование, 4 курс.
  Лекция 1. Паттерн Saga: введение.
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

# Паттерн Saga: введение

Распределённое программирование · Лекция 1

<div class="abs-bl m-10 text-muted text-base">
  4 курс · 2026
</div>

---

# План лекции

<div class="grid grid-cols-2 gap-12">
<div>

1. От 2PC к бизнес-процессам
2. Оформление заказа
3. Saga и compensations
4. Choreography
5. Orchestration

</div>
<div>

6. Сравнение подходов
7. Гарантии внутри сервиса
8. Saga в production
9. Разбор сбоя
10. Переход к Temporal

</div>
</div>

От локальных транзакций — к восстанавливаемому процессу заказа.

---
src: ./lectures/01-saga-intro/sections/01-introduction.md
---

---
src: ./lectures/01-saga-intro/sections/02-motivation.md
---

---
src: ./lectures/01-saga-intro/sections/03-saga.md
---

---
src: ./lectures/01-saga-intro/sections/04-choreography.md
---

---
src: ./lectures/01-saga-intro/sections/05-orchestration.md
---

---
src: ./lectures/01-saga-intro/sections/06-comparison.md
---

---
src: ./lectures/01-saga-intro/sections/07-service-guarantees.md
---

---
src: ./lectures/01-saga-intro/sections/08-production.md
---

---
src: ./lectures/01-saga-intro/sections/09-failure-analysis.md
---

---
src: ./lectures/01-saga-intro/sections/10-temporal.md
---
