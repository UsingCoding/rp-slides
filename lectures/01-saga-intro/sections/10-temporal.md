---
layout: section
number: 10
---

# От Saga к Temporal

Кто обеспечит надёжное исполнение?

---

# Мы начали строить workflow engine

- Persisted state и execution history.
- Retries, durable timers, recovery после падений.
- Concurrency и совместимость версий workflow.

**Durable execution** — выполнение, способное переживать падение процесса.

> Engine восстанавливает управление. Idempotency внешних эффектов остаётся нашей задачей.

---

# Следующая лекция: Temporal на Go

- **Workflow** — бизнес-orchestration с требованиями к детерминизму.
- **Activity** — взаимодействие с внешним миром; возможны retries.
- **Event History и Replay** — восстановление логики по истории.

> Как писать бизнес-orchestration, не строя инфраструктуру durable execution с нуля?

---

# ДЗ-шка

- Хореограция вашего бизнес-процесса :)