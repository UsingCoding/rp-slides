---
layout: section
number: 7
---

# Гарантии внутри сервиса

Чему должен соответствовать бизнес-процесс в каждом участнике Saga

---

# Что рассмотрим

- **Атомарность шага** — изменение состояния и outgoing message в одной транзакции
- **Idempotency** — повторная command или event не создаёт второй эффект
- **Допустимость перехода** — локальная state machine отклоняет устаревшие и неупорядоченные сообщения
- **Compensation** — idempotent, повторяема и корректна, даже если шаг не выполнялся
- **Отмена до выполнения** — сервис запоминает отмену и не выполняет шаг позже

---

# Атомарность шага

- Изменение данных и outgoing message фиксируются одним commit
- Падение не оставит «шаг без события» или «событие без шага»
- Обработка входящего сообщения и запись результата — тоже одна транзакция
- Реализация — Transactional Outbox, разберём в секции 8

---
layout: diagram
---

# Idempotency

```mermaid
sequenceDiagram
    participant S as Order Creator
    participant P as Payment
    S->>P: AuthorizePayment (key K)
    Note over P: Выполнить, сохранить K → результат
    P--xS: ответ потерян
    S->>P: AuthorizePayment (key K)
    Note over P: K уже есть → вернуть сохранённый результат
    P-->>S: OK (тот же authorization ID)
```

::caption::
Повтор с тем же key возвращает прежний результат, а не создаёт второй эффект

---
layout: diagram
---

# Допустимость перехода

```mermaid
stateDiagram-v2
    direction LR
    [*] --> New
    New --> Authorized: AuthorizePayment
    Authorized --> Voided: VoidAuthorization
    Voided --> [*]
    note right of Voided: AuthorizePayment здесь → reject
```

::caption::
Сервис проверяет текущее состояние: поздняя command не откатывает процесс назад

---

# Compensation

- **Idempotent** — повторный `VoidAuthorization` не меняет результат
- **Повторяема** — transient error → retry, пока не завершится
- **Корректна без шага** — authorization не было → ничего не делаем и отвечаем OK
- **Не стирает историю** — переводит запись в новое состояние, например Voided

---
layout: diagram
---

# Отмена до выполнения

```mermaid
sequenceDiagram
    participant S as Order Creator
    participant B as Broker
    participant K as Packing
    S->>B: PackOrder
    Note over B: доставка задержалась
    Note over S: timeout → Compensating
    S->>K: CancelPacking
    Note over K: PackOrder не было → сохранить отмену
    K-->>S: OK
    B->>K: PackOrder
    Note over K: Отмена уже есть → reject
```

::caption::
Без сохранённой отмены поздняя command выполнит шаг, который уже никто не компенсирует
