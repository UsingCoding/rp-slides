# Лекция 2. Приложения (не слайды)

Исходники демопроекта, дополнительные фрагменты Go, сценарий демонстраций и ссылки. В слайды не попадают.

## Приложение A. Полный учебный демопроект на Go (не слайды)

**Назначение.** Следующие файлы образуют небольшой сквозной пример. Он демонстрирует API Temporal, полный happy path, non-retryable отказ доставки, retry временного отказа оплаты, предварительную регистрацию компенсаций и простой Query для статуса. Он не претендует на production-ready архитектуру.

**Архитектурные ограничения демо:** mock-сервисы используют **in-memory** состояние и не сохраняют его после рестарта. Их нельзя использовать как доказательство надёжности внешних эффектов после падения mock-процесса. В production эффекты и идемпотентные ключи должны храниться в постоянной БД соответствующего сервиса. При демонстрации восстановления разрешается перезапускать **Worker**, сохраняя Temporal Service и mock-сервисы живыми.

### A.1. Установка и структура

```bash
mkdir temporal-order-saga && cd temporal-order-saga
go mod init example.com/temporal-order-saga
go get go.temporal.io/sdk@latest
```

Сохранить файлы по указанным ниже путям. Модульный путь `example.com/temporal-order-saga` должен совпадать с импортами в примерах.

### A.2. `order/types.go`

```go
package order

const TaskQueue = "order-saga-queue"

type OrderRequest struct {
	OrderID     string `json:"orderId"`
	ProductID   string `json:"productId"`
	Quantity    int    `json:"quantity"`
	AmountCents int64  `json:"amountCents"`
}

type OrderStatus struct {
	Phase       string `json:"phase"`
	LastError   string `json:"lastError,omitempty"`
	Compensated bool   `json:"compensated"`
}
```

### A.3. `order/activities.go`: HTTP-вызовы и классификация ошибок

```go
package order

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.temporal.io/sdk/activity"
	"go.temporal.io/sdk/temporal"
)

type Activities struct {
	BaseURL    string
	HTTPClient *http.Client
}

func (a *Activities) callService(ctx context.Context, operation string, req OrderRequest) error {
	payload, err := json.Marshal(req)
	if err != nil {
		return err
	}

	url := strings.TrimRight(a.BaseURL, "/") + "/" + operation
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	// Стабильный ключ для повторов ОДНОГО логического действия.
	httpReq.Header.Set("Idempotency-Key", req.OrderID+":"+operation)

	httpClient := a.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("%s network failure: %w", operation, err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	if resp.StatusCode == 429 || resp.StatusCode == 408 || resp.StatusCode >= 500 {
		return fmt.Errorf("%s temporary HTTP %d", operation, resp.StatusCode)
	}
	// Упрощённая классификация: прочие 4xx считаем бизнес-отказом.
	return temporal.NewNonRetryableApplicationError(
		fmt.Sprintf("%s rejected: HTTP %d", operation, resp.StatusCode),
		"BUSINESS_REJECTION", nil,
	)
}

func (a *Activities) ReserveInventory(ctx context.Context, r OrderRequest) error {
	activity.GetLogger(ctx).Info("reserve inventory", "orderId", r.OrderID)
	return a.callService(ctx, "reserve", r)
}
func (a *Activities) ReleaseInventory(ctx context.Context, r OrderRequest) error {
	return a.callService(ctx, "release", r)
}
func (a *Activities) ChargePayment(ctx context.Context, r OrderRequest) error {
	activity.GetLogger(ctx).Info("charge payment", "orderId", r.OrderID,
		"attempt", activity.GetInfo(ctx).Attempt)
	return a.callService(ctx, "charge", r)
}
func (a *Activities) RefundPayment(ctx context.Context, r OrderRequest) error {
	return a.callService(ctx, "refund", r)
}
func (a *Activities) ScheduleDelivery(ctx context.Context, r OrderRequest) error {
	return a.callService(ctx, "schedule", r)
}
func (a *Activities) CancelDelivery(ctx context.Context, r OrderRequest) error {
	return a.callService(ctx, "cancel", r)
}
```

**Объяснение:** Activity работает с обычным `context.Context`, поэтому может использовать `http.NewRequestWithContext`. Временные ответы 503 и сетевые ошибки возвращаются как retryable `error`; бизнес-отказы возвращают `temporal.NewNonRetryableApplicationError`. Это **упрощённая** классификация: в реальном Payment API конкретные статусы нужно разбирать по контракту. Даже `500` может означать «эффект произошёл, но ответ не доставлен», что требует идемпотентности и reconciliation.

### A.4. `order/workflow.go`: Saga с компенсациями и Query

```go
package order

import (
	"fmt"
	"strings"
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

func activityOptions() workflow.ActivityOptions {
	return workflow.ActivityOptions{
		StartToCloseTimeout:    10 * time.Second,
		ScheduleToCloseTimeout: 45 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2,
			MaximumInterval:    10 * time.Second,
			MaximumAttempts:    3,
		},
	}
}

func compensationOptions() workflow.ActivityOptions {
	return workflow.ActivityOptions{
		StartToCloseTimeout:    10 * time.Second,
		ScheduleToCloseTimeout: 60 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2,
			MaximumInterval:    10 * time.Second,
			MaximumAttempts:    5,
		},
	}
}

func OrderWorkflow(ctx workflow.Context, req OrderRequest) (retErr error) {
	state := OrderStatus{Phase: "STARTED"}
	if err := workflow.SetQueryHandler(ctx, "status", func() (OrderStatus, error) {
		return state, nil
	}); err != nil {
		return err
	}

	logger := workflow.GetLogger(ctx)
	forwardCtx := workflow.WithActivityOptions(ctx, activityOptions())
	compensations := make([]string, 0, 3)

	// Выполнить компенсации при ошибке ИЛИ отмене Workflow.
	defer func() {
		if retErr == nil {
			return
		}
		state.Phase = "COMPENSATING"
		logger.Warn("saga compensating", "orderId", req.OrderID, "cause", retErr)

		// Контекст cleanup не отменён даже если исходный ctx уже отменён.
		cleanupCtx, cancel := workflow.NewDisconnectedContext(ctx)
		defer cancel()
		cleanupCtx = workflow.WithActivityOptions(cleanupCtx, compensationOptions())

		var failures []string
		for i := len(compensations) - 1; i >= 0; i-- {
			step := compensations[i]
			err := workflow.ExecuteActivity(cleanupCtx, step, req).Get(cleanupCtx, nil)
			if err != nil {
				failures = append(failures, fmt.Sprintf("%s: %v", step, err))
				logger.Error("compensation failed", "activity", step, "error", err)
				// Оставшиеся независимые компенсации всё равно пытаемся выполнить.
			} else {
				logger.Info("compensation succeeded", "activity", step)
			}
		}
		if len(failures) > 0 {
			state.Phase = "NEEDS_ATTENTION"
			state.LastError = retErr.Error() + "; compensation failures: " + strings.Join(failures, "; ")
			retErr = fmt.Errorf("%w; compensation failures: %s", retErr, strings.Join(failures, "; "))
			return
		}
		state.Phase = "COMPENSATED"
		state.Compensated = true
		state.LastError = retErr.Error()
	}()

	state.Phase = "RESERVING"
	// Регистрируем ДО вызова: внешний эффект может произойти без ответа.
	compensations = append(compensations, "ReleaseInventory")
	if err := workflow.ExecuteActivity(forwardCtx, "ReserveInventory", req).
		Get(forwardCtx, nil); err != nil {
		return fmt.Errorf("reserve: %w", err)
	}

	state.Phase = "CHARGING"
	compensations = append(compensations, "RefundPayment")
	if err := workflow.ExecuteActivity(forwardCtx, "ChargePayment", req).
		Get(forwardCtx, nil); err != nil {
		return fmt.Errorf("charge: %w", err)
	}

	state.Phase = "SCHEDULING_DELIVERY"
	compensations = append(compensations, "CancelDelivery")
	if err := workflow.ExecuteActivity(forwardCtx, "ScheduleDelivery", req).
		Get(forwardCtx, nil); err != nil {
		return fmt.Errorf("schedule delivery: %w", err)
	}

	state.Phase = "COMPLETED"
	logger.Info("order complete", "orderId", req.OrderID)
	return nil
}
```

**Важное уточнение для преподавателя:** компенсация `CancelDelivery` регистрируется заранее, даже если доставка никогда не была создана. Это корректно **только при контракте** `cancel` как идемпотентной операции, которая безопасно делает no-op при отсутствии доставки. То же относится к `refund` и `release`. В production лучше учитывать результат/идентификатор каждого внешнего действия и реальную возможность его отменить. Если compensation из-за своей ошибки не выполнилась, статус `NEEDS_ATTENTION` в локальном `state` — лишь часть диагностики: после завершения Workflow с ошибкой доменная система должна иметь собственный механизм долговременного учёта и восстановления.

### A.5. `cmd/worker/main.go`: процесс Worker

```go
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"example.com/temporal-order-saga/order"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func main() {
	c, err := client.Dial(client.Options{
		HostPort:  client.DefaultHostPort,
		Namespace: client.DefaultNamespace,
	})
	if err != nil {
		log.Fatal(err)
	}
	defer c.Close()

	baseURL := os.Getenv("MOCK_SERVICES_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}

	w := worker.New(c, order.TaskQueue, worker.Options{})
	w.RegisterWorkflow(order.OrderWorkflow)
	w.RegisterActivity(&order.Activities{
		BaseURL:    baseURL,
		HTTPClient: &http.Client{Timeout: 5 * time.Second},
	})
	log.Println("Order Worker started; task queue:", order.TaskQueue)
	if err := w.Run(worker.InterruptCh()); err != nil {
		log.Fatal(err)
	}
}
```

### A.6. `cmd/start/main.go`: запуск нового исполнения

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"example.com/temporal-order-saga/order"
	"go.temporal.io/sdk/client"
)

func main() {
	orderID := "order-1001"
	if len(os.Args) > 1 {
		orderID = os.Args[1]
	}
	req := order.OrderRequest{
		OrderID: orderID, ProductID: "sku-1", Quantity: 1,
		AmountCents: 1999,
	}
	c, err := client.Dial(client.Options{
		HostPort:  client.DefaultHostPort,
		Namespace: client.DefaultNamespace,
	})
	if err != nil {
		log.Fatal(err)
	}
	defer c.Close()

	run, err := c.ExecuteWorkflow(context.Background(), client.StartWorkflowOptions{
		ID:        "order:" + req.OrderID,
		TaskQueue: order.TaskQueue,
	}, order.OrderWorkflow, req)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Started Workflow ID=%s Run ID=%s\n", run.GetID(), run.GetRunID())

	// В обычном HTTP API мы вернули бы 202 Accepted и IDs здесь.
	// Только для CLI-демо ждём финального результата.
	if err := run.Get(context.Background(), nil); err != nil {
		log.Printf("Workflow finished with error: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Workflow completed successfully")
}
```

### A.7. `cmd/mockservices/main.go`: учебные внешние сервисы

```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	"example.com/temporal-order-saga/order"
)

type state struct {
	mu                sync.Mutex
	completed         map[string]bool
	temporaryFailures map[string]int
}

func main() {
	s := &state{
		completed:         make(map[string]bool),
		temporaryFailures: make(map[string]int),
	}
	mux := http.NewServeMux()
	operations := []string{"reserve", "release", "charge", "refund", "schedule", "cancel"}
	for _, op := range operations {
		operation := op
		mux.HandleFunc("/"+operation, func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				http.Error(w, "method", 405)
				return
			}
			var req order.OrderRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "bad JSON", 400)
				return
			}
			key := r.Header.Get("Idempotency-Key")
			expected := req.OrderID + ":" + operation
			if key != expected {
				http.Error(w, "bad idempotency key", 400)
				return
			}

			s.mu.Lock()
			defer s.mu.Unlock()
			fmt.Printf("mock: %-8s order=%s key=%s\n", operation, req.OrderID, key)
			if s.completed[key] {
				w.WriteHeader(http.StatusOK)
				fmt.Fprintln(w, "already processed")
				return
			}
			if operation == "charge" && strings.HasPrefix(req.OrderID, "retry-payment-") {
				if s.temporaryFailures[key] == 0 {
					s.temporaryFailures[key]++
					http.Error(w, "temporary payment outage", http.StatusServiceUnavailable)
					return
				}
			}
			if operation == "schedule" && strings.HasPrefix(req.OrderID, "fail-delivery-") {
				http.Error(w, "unsupported delivery address", http.StatusUnprocessableEntity)
				return
			}
			// В учебном mock мы считаем отсутствие forward-эффекта допустимым
			// для release/refund/cancel (идемпотентный no-op).
			s.completed[key] = true
			w.WriteHeader(http.StatusOK)
			fmt.Fprintln(w, "ok")
		})
	}
	log.Println("Mock services listening on :8081 (in-memory only)")
	log.Fatal(http.ListenAndServe(":8081", mux))
}
```

**Ограничения mock:** это *один* HTTP-сервер с шестью путями, хотя в реальной системе это три отдельных микросервиса. In-memory модель не гарантирует долговременную идемпотентность. При `refund` и `release` она не проверяет реальную платёжную или складскую запись — это сделано для показа порядка вызовов, а не для изучения банковской предметной области.

### A.8. Запуск и сценарии

```bash
# Терминал A: Temporal Service + UI
temporal server start-dev

# Терминал B: учебные внешние сервисы
go run ./cmd/mockservices

# Терминал C: Worker
go run ./cmd/worker

# Терминал D: happy path
go run ./cmd/start order-1001

# Бизнес-ошибка доставки → обратные Activities (завершится ошибкой)
go run ./cmd/start fail-delivery-1002

# Первая попытка оплаты 503 → retry → success
go run ./cmd/start retry-payment-1003
```

Каждый сценарий использовать с **новым** `orderID` либо согласовать политику повторного использования Workflow ID. При повторном запуске того же `orderID` уже существующая история и политика Temporal могут изменить ожидаемое поведение. Запускайте сценарии после старта Worker и mock-сервисов.

#### Сценарий: остановка Worker

1. Запустить Temporal, mock-сервисы и Worker.
2. Начать заказ и остановить Worker (`Ctrl+C`) в момент выполнения/ожидания (для живого demo лучше добавить искусственную задержку в mock `/schedule` или отдельную Activity ожидания).
3. Убедиться, что Workflow остаётся видимым в Temporal UI, а Task Queue не обрабатывается.
4. Перезапустить только Worker. Workflow продолжится с сохранённой историей; незавершённая Activity может повториться после таймаута/восстановления.

**Предостережение:** без искусственных задержек демонстрационные Activities завершатся слишком быстро, и попасть в «середину Workflow» вручную сложно. Нельзя обещать, что `Ctrl+C` в случайный момент обязательно покажет replay. При подготовке доклада добавьте флаг задержки и репетируйте тайминг.

---

## Приложение B. Дополнительные фрагменты Go (не слайды)

### B.1. Пример явного ожидания сигнала с таймаутом

```go
// Упрощённый пример для самостоятельного упражнения.
func ApprovalWithTimeout(ctx workflow.Context, orderID string) error {
    signalCh := workflow.GetSignalChannel(ctx, "approve")
    approved := false
    received := false

    selector := workflow.NewSelector(ctx)
    selector.AddReceive(signalCh, func(ch workflow.ReceiveChannel, _ bool) {
        ch.Receive(ctx, &approved)
        received = true
    })
    timer := workflow.NewTimer(ctx, 24*time.Hour)
    selector.AddFuture(timer, func(workflow.Future) {})
    selector.Select(ctx)

    if !received { return fmt.Errorf("approval timeout") }
    if !approved { return fmt.Errorf("customer rejected") }
    return nil
}
```

*Импорты для отдельного файла*: `fmt`, `time`, `go.temporal.io/sdk/workflow`. Для сложных сценариев важно аккуратно обрабатывать одновременное событие и завершение таймера и отменять ненужный таймер.

### B.2. Query из внешнего клиента

```go
value, err := c.QueryWorkflow(ctx, "order:"+orderID, "", "status")
if err != nil { return err }
var status order.OrderStatus
if err := value.Get(&status); err != nil { return err }
fmt.Printf("%+v\n", status)
```

Для завершённых Failed Workflows использование Query может зависеть от того, какие состояния доступны и как обрабатывается запрос; для гарантированного долговременного business-status храните запись в своей системе или используйте подходящий read model.

### B.3. Search Attributes (requires namespace registration)

```go
// Внутри Workflow, например при старте:
key := temporal.NewSearchAttributeKeyKeyword("OrderId")
if err := workflow.UpsertTypedSearchAttributes(
    ctx,
    key.ValueSet(req.OrderID),
); err != nil {
    return err
}
```

Убедитесь, что ваш Go SDK поддерживает typed Search Attributes API, а Search Attribute `OrderId` зарегистрирован в Namespace.

### B.4. Observability: SDK metrics

Промышленное подключение Prometheus / OpenTelemetry зависит от версии SDK и используемого exporter. Официальный Go SDK позволяет передать `MetricsHandler` в `client.Options`, откуда SDK-метрики будут доступны клиенту и Worker. Настройку конкретной библиотеки exporter и названий метрик не копировать вслепую между версиями: ориентироваться на `docs.temporal.io/develop/go/platform/observability` и примеры `temporalio/samples-go`.

### B.5. Риск «платёж прошёл, но Activity вернула timeout»

```text
1. Worker -> Payment API: POST /charge, Idempotency-Key: order-42:charge
2. Payment: списал 19.99, записал ключ и результат.
3. Ответ потерян / Activity timeout.
4. Temporal: повторяет ChargePayment.
5. Worker -> Payment API: тот же Idempotency-Key.
6. Payment: возвращает сохранённый результат, НЕ списывает второй раз.
```

Для компенсации платёжный сервис должен уметь `RefundPayment(orderID)` как отдельную идемпотентную бизнес-операцию и корректно обрабатывать случай «charge так и не состоялся». При неоднозначном состоянии может потребоваться отдельный read/reconcile API.

---

## Приложение C. Сценарий демонстраций и вопросы студентам (не слайды)

| Момент | Что показать | Вопрос в аудиторию | Ожидаемый тезис |
|---|---|---|---|
| Слайд 25 | `order-1001` в UI | Почему API не ждёт конца? | Start асинхронен |
| Слайд 27 | Restart Worker | Что сохранилось? | Event History, не RAM |
| Слайд 32 | Неоднозначная оплата | Возможен второй HTTP-вызов? | Да, требуется idempotency |
| Слайд 41 | `fail-delivery-1002` | Кто делает refund? | Наша compensation Activity |
| Слайд 47 | `retry-payment-1003` | Это replay или retry? | Retry Activity |
| Слайд 57 | Event History | Где найти причину failure? | Activity failure / история |
| Слайд 60 | Зависший заказ | С чего начать расследование? | ID → History → Worker/metrics/logs |

### Самостоятельное задание после лекции

1. Добавить ожидание подтверждения заказа через Signal с дедлайном 24 часа.
2. Реализовать Query `status` и endpoint `GET /orders/{id}/status`.
3. Написать unit-тесты Workflow на happy path, ошибку Payment и ошибку компенсации с помощью `testsuite.WorkflowTestSuite`.
4. Проверить, что повторный запрос оплаты с одним ключом не создаёт двойного эффекта.
5. Добавить Search Attribute для поиска заказов, ожидающих ручного вмешательства.

---

## Приложение D. Ссылки и проверка терминологии (не слайды)

Официальная документация Temporal (актуальные версии и детали API проверять перед занятием):

- Go SDK: https://docs.temporal.io/develop/go
- Workflow basics / deterministic execution: https://docs.temporal.io/develop/go/workflows/basics
- Activity basics: https://docs.temporal.io/develop/go/activities/basics
- Activity execution and retry: https://docs.temporal.io/develop/go/activities/execution
- Go Client: https://docs.temporal.io/develop/go/client/temporal-client
- Message passing (Signals, Queries, Updates): https://docs.temporal.io/develop/go/workflows/message-passing
- Cancellation / disconnected context: https://docs.temporal.io/develop/go/workflows/cancellation
- Observability / Go: https://docs.temporal.io/develop/go/platform/observability
- Workflow versioning: https://docs.temporal.io/develop/go/workflows/versioning
- Search/Visibility concepts: https://docs.temporal.io/visibility
- Temporal CLI: https://docs.temporal.io/cli
- Go SDK samples: https://github.com/temporalio/samples-go

**Техническая оговорка:** Go-примеры предназначены для разъяснения Temporal API и учебной сборки проекта. Не включают TLS/auth в Temporal Cloud, secret management, durable state in downstream services, внешнюю транзакционность/idempotency storage, OpenTelemetry setup и полноценный reconciliation, которые потребуются в реальной системе.
