# Лекция 2. Temporal: реализация Saga и orchestration на Go

90 минут, 70 слайдов с обложкой, планом, разделителями и ДЗ. Точка входа — `02-temporal-saga.md`. Предпосылки: распределённые системы, 2PC, Saga, choreography/orchestration (лекция 1). Примеры ориентированы на Temporal Go SDK 1.x; перед занятием проверить совместимость актуальных зависимостей.

Комментарии лектора — speaker notes в HTML-комментарии в конце каждого слайда (Presenter Mode). Исходники демопроекта, дополнительные Go-фрагменты, сценарий демонстраций и ссылки — в `appendix.md`; в слайды они не попадают.

## Маршрут занятия

| Блок | Тема | Минуты | Слайды | Файл в `sections/` |
| --- | --- | ---: | --- | --- |
| 1 | От Saga к Temporal | 5 | 3–9 | `01-from-saga.md` |
| 2 | Основные концепции | 8 | 10–16 | `02-concepts.md` |
| 3 | Архитектура и жизненный цикл | 8 | 17–22 | `03-architecture.md` |
| 4 | Интеграция в Go-приложение | 12 | 23–28 | `04-go-integration.md` |
| 5 | Durable Execution / Replay | 10 | 29–35 | `05-durable-execution.md` |
| 6 | Реализация Saga | 13 | 36–45 | `06-saga.md` |
| 7 | Retry, timeout, ошибки | 10 | 46–51 | `07-retry-timeout.md` |
| 8 | Взаимодействие с Workflow | 8 | 52–57 | `08-interaction.md` |
| 9 | Observability | 12 | 58–64 | `09-observability.md` |
| 10 | Production и итоги | 4 | 65–70 | `10-production.md` |

## Правила содержания

- Сквозной пример **Order Saga**: `ReserveInventory → ChargePayment → ScheduleDelivery`; compensations `ReleaseInventory`, `RefundPayment`, `CancelDelivery`.
- Перед «ответом» просить зрителей сформулировать предсказание: «Что произойдёт после падения Worker?», «Повторится ли списание?», «Что увидим в Event History?».
- **Не обещать exactly-once вызов внешних сервисов.** Temporal не откатывает бизнес-операции автоматически: compensation реализуется прикладным кодом.

## Запуск

- `mise exec -- pnpm dev:02` — просмотр лекции.
- `mise exec -- pnpm build:02` — сборка в `dist/02-temporal-saga/`.
- `mise exec -- pnpm export:02:pdf` — экспорт PDF.
