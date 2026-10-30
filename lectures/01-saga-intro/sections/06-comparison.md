---
layout: section
number: 6
---

# Choreography или orchestration?

Выбираем расположение логики, а не «лучший паттерн»

---

# Где живут решения?

| Критерий | Choreography | Orchestration |
| --- | --- | --- |
| Управление | Реакции участников | Явный state machine |
| Бизнес-логика | Порядок распределён | Порядок в orchestrator |
| Эволюция | Contracts и subscriptions | Версии процесса и commands |

---

# Как понять, что произошло?

| Критерий | Choreography | Orchestration |
| --- | --- | --- |
| Тесты | Contract tests + вся цепочка | Transitions + integration tests |
| Отладка | Сбор фактов участников | Состояние Saga + факты |
| Мониторинг | End-to-end projection | Очередь состояний Saga |

---

# Orchestrator — не обязательно single point of failure

- Несколько replicas исполняют одну модель процесса
- Durable store сохраняет прогресс между restarts
- Версия или lock защищает transition Saga
- High availability нужна также хранилищу и транспорту

---

# Критерии выбора

- Простая цепочка events → **choreography**
- Ветвления и компенсации → **orchestration**
- Выбор зависит от цены сквозного сопровождения

---

# Гибрид: процесс управляем, факты публикуем

- Orchestrator ведёт критический путь заказа
- Участники публикуют events о результатах своих операций
- Аналитика и уведомления реагируют независимо
- У каждого перехода — один владелец решения
