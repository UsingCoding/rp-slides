---
layout: section
number: 1
---

# Напоминание

Что мы уже знаем о Saga

---
layout: diagram
---

# Choreography через events

```mermaid
flowchart LR
    O[Order Service] -- OrderCreated --> P[Payment Service]
    P -- PaymentCompleted --> I[Inventory Service]
    I -- StockFailed --> P
    P -- PaymentRefunded --> O
```
