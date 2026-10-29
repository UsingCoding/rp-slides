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

Распределённое программирование · Лекция 1 · 90 минут

<div class="abs-bl m-10 text-muted text-base">
  4 курс · 2026
</div>

<!--
Обложка до начала отсчёта. Цель: спроектировать согласованный процесс заказа без глобальной транзакции и объяснить его поведение при потере ответа и рестарте.
Все девять разделов вместе занимают 90 минут, включая обсуждения. Тайминги отдельных слайдов и ответы находятся в заметках преподавателя.
-->

---

# План лекции

<div class="grid grid-cols-2 gap-12">
<div>

1. От 2PC к бизнес-процессам — **8 мин**
2. Оформление заказа — **10 мин**
3. Saga и компенсации — **15 мин**
4. Хореография — **14 мин**
5. Оркестрация — **15 мин**

</div>
<div>

6. Сравнение подходов — **10 мин**
7. Надёжность на практике — **10 мин**
8. Разбор сбоя — **6 мин**
9. Переход к Temporal — **2 мин**

</div>
</div>

От локальных транзакций — к восстанавливаемому процессу заказа.

<!--
Организационный слайд до начала отсчёта 90 минут, как и обложка.
Обозначить маршрут: сначала проблема и модель компенсаций, затем два способа управления и проверка поведения при сбоях. Обсуждения уже включены во время разделов.
-->

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
src: ./lectures/01-saga-intro/sections/07-production.md
---

---
src: ./lectures/01-saga-intro/sections/08-failure-analysis.md
---

---
src: ./lectures/01-saga-intro/sections/09-temporal.md
---
