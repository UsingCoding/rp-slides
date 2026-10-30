---
layout: section
number: 2
---

# История одного заказа

Разбираем успешный путь и два отказа

---
layout: diagram
---

# Каждый сервис владеет своей базой

```mermaid
flowchart LR
    subgraph O[Order Service]
        OS[Order] --> OD[(Order DB)]
    end
    subgraph I[Inventory Service]
        IS[Reservation] --> ID[(Inventory DB)]
    end
    subgraph P[Payment Service]
        PS[Authorization] --> PD[(Payment DB)]
    end
    subgraph D[Delivery Service]
        DS[Booking] --> DD[(Delivery DB)]
    end
    OS -. command .-> IS
    IS -. result .-> PS
    PS -. result .-> DS
```

---
layout: diagram
---

# Happy path: ресурсы → заказ Confirmed

```mermaid
flowchart LR
    O[Order<br/>Pending] --> I[Inventory<br/>reserve]
    I --> P[Payment<br/>authorize]
    P --> D[Delivery<br/>b1Mook]
    D --> C[Order<br/>Confirmed]
```

::caption::
Каждый результат подтверждён

---
layout: diagram
---

# PaymentFailed после резерва

```mermaid
sequenceDiagram
    participant O as Order / Saga
    participant I as Inventory
    participant P as Payment
    O->>I: ReserveInventory
    I-->>O: InventoryReserved
    O->>P: AuthorizePayment
    P-->>O: PaymentFailed
    O->>I: ReleaseInventory
    I-->>O: InventoryReleased
    Note over O: Order → Cancelled
```

::caption::
PaymentFailed — достоверный отказ authorization, а не timeout.

---
layout: diagram
---

# DeliveryBookingFailed после authorization

```mermaid
sequenceDiagram
    participant O as Order / Saga
    participant P as Payment
    participant I as Inventory
    participant D as Delivery
    Note over O,D: InventoryReserved и PaymentAuthorized уже получены
    O->>D: BookDelivery
    D-->>O: DeliveryBookingFailed
    O->>P: VoidAuthorization
    P-->>O: AuthorizationVoided
    O->>I: ReleaseInventory
    I-->>O: InventoryReleased
    Note over O: Order → Cancelled
```

::caption::
Сначала VoidAuthorization, затем ReleaseInventory; Cancelled — после обоих.

---

# Какие особенности

- Timeout не равен отказу платежа или доставки
- До выяснения исхода заказ остаётся Pending
- Внутри БД откатываются только локальные изменения

