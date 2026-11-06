---
layout: section
number: 4
---

# Интеграция Temporal в Go

Worker, Client и первый запуск

---

# Структура демонстрационного проекта

<div class="grid grid-cols-2 gap-12">
<div>

```text
temporal-order-saga/
├── go.mod
├── order/
│   ├── types.go
│   ├── workflow.go
│   └── activities.go
└── cmd/
    ├── worker/main.go
    ├── start/main.go
    └── mockservices/main.go
```

</div>
<div>

- `workflow.go`: orchestration и compensations.
- `activities.go`: HTTP-интеграции и обработка ошибок.
- `worker`: регистрация исполняемого кода.
- `start`: имитация REST-клиента.

</div>
</div>

<!--
Покажите структуру и объясните разделение. Полные исходники — в lectures/02-temporal-saga/appendix.md (приложение A), их можно вынести в отдельный Git-репозиторий. Наша учебная команда запускает три процесса: Temporal Dev Server, mock-сервисы и Worker. Четвёртым короткоживущим процессом запускаем новый заказ.
-->

---

# Local dev: Temporal CLI и SDK

```bash
# Предварительно установить актуальный Temporal CLI:
# https://docs.temporal.io/cli

temporal server start-dev

# В другом терминале:
go mod init example.com/temporal-order-saga
go get go.temporal.io/sdk@latest
```

- По умолчанию локальный frontend: `localhost:7233`.
- Temporal Web UI в dev-режиме: `http://localhost:8233`.
- Сначала проверяем подключение к Service, потом запускаем Worker.

<!--
start-dev — среда локальной разработки, не production-инсталляция. В зависимости от версии CLI опции и адреса можно изменить; на демо лучше использовать значения по умолчанию и заранее проверить вывод команды. Отдельная часть эксплуатации Temporal Service — тема другой лекции.
-->

---

# Создаём и запускаем Worker

```go
c, err := client.Dial(client.Options{
    HostPort: client.DefaultHostPort,
    Namespace: client.DefaultNamespace,
})
if err != nil { log.Fatal(err) }
defer c.Close()

w := worker.New(c, order.TaskQueue, worker.Options{})
w.RegisterWorkflow(order.OrderWorkflow)
w.RegisterActivity(&order.Activities{
    BaseURL: "http://localhost:8081",
    HTTPClient: &http.Client{Timeout: 5 * time.Second},
})
log.Fatal(w.Run(worker.InterruptCh()))
```

<!--
Это центральный кусок интеграции. RegisterWorkflow делает определение доступным для исполнения. RegisterActivity регистрирует методы структуры, включая вызовы HTTP. Worker слушает Task Queue, указанную при старте заказа. Если названия Task Queue расходятся, Workflow будет существовать, но не начнёт выполняться — хороший пример для observability.
-->

---

# Запускаем Workflow из приложения

```go
run, err := c.ExecuteWorkflow(
    context.Background(),
    client.StartWorkflowOptions{
        ID: "order:" + req.OrderID,
        TaskQueue: order.TaskQueue,
    },
    order.OrderWorkflow,
    req,
)
if err != nil { return err }
fmt.Println(run.GetID(), run.GetRunID())
```

- В API вернуть `202 Accepted` и `workflowId`.
- `ExecuteWorkflow` **не ждёт** завершения всех шагов.
- `run.Get(ctx, &result)` — опциональное ожидание завершения, не для обычного долгого HTTP-запроса.

<!--
Проведите границу между «старт приняли» и «операцию успешно завершили». Для REST-интеграции важно определить публичный API: POST /orders, GET /orders/{id}/status, а также отдельное действие отмены. Подчеркните, что Temporal Workflow ID становится удобным ключом корреляции, но не заменяет доменную запись заказа в базе данных.
-->

---

# Демо: happy path

<div class="grid grid-cols-2 gap-12">
<div>

```bash
# Терминал 1
temporal server start-dev
# Терминал 2
go run ./cmd/mockservices
# Терминал 3
go run ./cmd/worker
# Терминал 4
go run ./cmd/start order-1001
```

</div>
<div>

**Посмотреть в UI:**

1. Workflow Type: `OrderWorkflow`.
2. Workflow ID: `order:order-1001`.
3. Три Activities в правильном порядке.
4. Конечный статус `Completed`.

</div>
</div>

<!--
Покажите в Temporal UI исполнение с конкретным ID. Пусть студенты сначала найдут Activity, затем события её запуска и завершения. Попросите описать, что делает Worker, а что Temporal Service. Демонстрацию стоит заранее прогнать: на слайде приведён минимальный маршрут, а не инструкция по установке Go/CLI.

Вопрос в аудиторию: почему API не ждёт конца? Ожидаемый тезис: Start асинхронен.
-->
