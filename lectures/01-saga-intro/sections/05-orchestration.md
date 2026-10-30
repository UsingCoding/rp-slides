---
layout: section
number: 5
---

# Orchestration

Явный владелец процесса — Order Creator

---
layout: diagram
---

# Процесс заказа с orchestrator: happy path

```mermaid
sequenceDiagram
    participant S as Order Creator
    participant O as Order
    participant I as Inventory
    participant P as Payment
    participant D as Delivery
    S->>O: CreateOrder
    O-->>S: OrderCreated
    S->>I: ReserveInventory
    I-->>S: InventoryReserved
    S->>P: AuthorizePayment
    P-->>S: PaymentAuthorized
    S->>D: BookDelivery
    D-->>S: DeliveryBooked
    S->>O: ConfirmOrder
    O-->>S: OrderConfirmed
    Note over S: Completed
```

--- 

# Процесс = State Machine

* Четкая последовательность переходов
* В сервисе координаторе программируется как чистый бизнесс-процесс

---
layout: diagram
---

# State machine: happy path

```mermaid
sequenceDiagram
    participant S as Order Creator
    participant O as Order
    participant I as Inventory
    participant P as Payment
    participant D as Delivery
    Note over S: Creating
    S->>O: CreateOrder
    O-->>S: OK
    Note over S: Reserving
    S->>I: ReserveInventory
    I-->>S: OK
    Note over S: Authorizing
    S->>P: AuthorizePayment
    P-->>S: OK
    Note over S: Booking
    S->>D: BookDelivery
    D-->>S: OK
    Note over S: Confirming
    S->>O: ConfirmOrder
    O-->>S: OK
    Note over S: Completed
```

---
layout: diagram
---

# State machine: compensation path

```mermaid
sequenceDiagram
    participant S as Order Creator
    participant O as Order
    participant I as Inventory
    participant P as Payment
    participant D as Delivery
    Note over S: Booking
    S->>D: BookDelivery
    D-->>S: Failed
    Note over S: Voiding
    S->>P: VoidAuthorization
    P-->>S: OK
    Note over S: Releasing
    S->>I: ReleaseInventory
    I-->>S: OK
    Note over S: Cancelling
    S->>O: CancelOrder
    O-->>S: OK
    Note over S: Cancelled
```

::caption::
Отказ AuthorizePayment: Authorizing → Releasing, VoidAuthorization не нужен

---

# Оркестратор

* Персистентное состояние - знает про все шаги и их состояние
* **Должен** выдерживать перезапуск и падения. Иначе просто потеряем весь процесс
* Единая точка отказа всего бизнес-процесса
* Retry, Cancel, Reconcile, Versioning - его ответственность

---

# Почему обработка исключений при HTTP-вызовах — ещё не orchestrator

- Исключение не доказывает отсутствие эффекта
- Crash процесса уничтожает stack и timers
- Retry запроса может повторить всю цепочку
- Нужны сохранённые transitions, исходы и compensations

---
layout: diagram
---

# Новый участник: Packing в orchestration

```mermaid
sequenceDiagram
    participant S as Order Creator
    participant O as Order
    participant I as Inventory
    participant P as Payment
    participant K as Packing
    participant D as Delivery
    S->>O: CreateOrder
    S->>I: ReserveInventory
    S->>P: AuthorizePayment
    rect rgba(234, 88, 12, 0.15)
    Note over S: Packing
    S->>K: PackOrder
    K-->>S: OK
    end
    S->>D: BookDelivery
    alt OK
    S->>O: ConfirmOrder
    else Failed
    rect rgba(234, 88, 12, 0.15)
    S->>K: CancelPacking
    K-->>S: OK
    end
    S->>P: VoidAuthorization
    S->>I: ReleaseInventory
    S->>O: CancelOrder
    end
```

::caption::
Меняется только Order Creator: новое состояние, command и compensation. Остальные участники о Packing не знают

---

# Versioning бизнес-процесса

- Изменение бизнес-процесса требует **явного versioning** в orchestrator
- Каждая Saga хранит версию процесса, с которой стартовала
- **v1** — без Packing: уже запущенные Saga доходят до конца по старой схеме
- **v2** — с Packing: по ней стартуют только новые Saga
- Compensations тоже по версии: Saga v1 не вызывает `CancelPacking`
- Packing развёрнут до запуска v2; код v1 удаляем, когда все Saga v1 завершились

---
layout: diagram
---

# Отмена операции пользователем в orchestration

```mermaid
sequenceDiagram
    participant S as Order Creator
    participant O as Order
    participant I as Inventory
    participant P as Payment
    participant D as Delivery
    Note over S: Booking: BookDelivery выполнен
    O->>S: RequestCancellation
    Note over S: Booking → Compensating
    rect rgba(234, 88, 12, 0.15)
    S->>D: CancelDelivery
    D-->>S: OK
    end
    S->>P: VoidAuthorization
    P-->>S: OK
    S->>I: ReleaseInventory
    I-->>S: OK
    S->>O: CancelOrder
    O-->>S: OK
    Note over S: Cancelled
```

::caption::
Отмену получает только Order Creator: по своему состоянию он знает, какие шаги компенсировать

---

# Где располагать логику orchestration

<div class="grid grid-cols-2 gap-12">
<div>

**Внутри Order**

- Order знает детали всех шагов бизнес-процесса
- Order знает всех участников

</div>
<div>

**Отдельный сервис Order Creator**

- Сервис одного бизнес-сценария
- Обычно дороже в эксплуатации
- Зато бизнес-сценарием можно управлять как отдельным сервисом

</div>
</div>

---

# Плюсы orchestration

- Весь бизнес-процесс описан в одном месте
- Состояние каждой Saga явное: видно, где она остановилась
- Новый шаг — правка только в orchestrator
- Retry, cancel и reconciliation собраны в одном компоненте
- Участники проще: выполняют command и не знают о процессе

---

# Минусы и сложности orchestration

- Orchestrator — ещё один компонент, который нужно сделать надёжным
- Без orchestrator процесс стоит: нужны persistent state и restart
- Риск «god service»: бизнес-логика участников утекает в orchestrator
- Versioning процесса для уже запущенных Saga
- Durable state, timers и outbox — по сути свой workflow engine
