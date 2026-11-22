# Distributed Saga Orchestration & Transaction Coordination Architecture

> **Document Status**: `PROPOSED DESIGN` / `APPROVED DECISIONS` (Phase 2E-R Specification)  
> **Target System**: Automotive Platform (8 Standalone Spring Boot Microservices, Apache APISIX Gateway)  
> **Key Architectural Authority**: Approved Decisions A, B, C, D (Section 3 of Phase 2E-R Charter)  
> **Implementation Status**: Architectural Specification; Persistence, Outbox, and Sagas are `[PLANNED]`

---

## 1. Saga Definition & Motivation

In a microservice architecture where each service owns its database exclusively, a single business transaction frequently spans multiple bounded contexts. For example, purchasing four tires with an in-store installation requires:
1. Reserving physical stock in `automotive-product`.
2. Reserving a physical service bay in `store-management`.
3. Creating a scheduled customer appointment in `appointment`.
4. Authorizing customer payment with Stripe in `automotive-operations`.

Historically, distributed transactions across databases relied on two-phase commit (2PC / XA protocols). However, **2PC is strongly rejected** for our platform because:
- **Lock Holding Across Networks**: 2PC holds database row locks across network roundtrips, causing lock escalation and catastrophic latency amplification under load.
- **Single Point of Failure (Coordinator Deadlock)**: If the transaction coordinator crashes during the prepare phase, participating databases remain blocked holding locks indefinitely.
- **Cloud & Microservice Incompatibility**: Modern cloud environments, SaaS APIs (such as Stripe), and independent PostgreSQL database instances do not natively support or perform well with 2PC.

Instead, the platform implements the **Saga Pattern**:
> A **Saga** is a sequence of independent local ACID transactions. Each transaction updates data within a single service and dispatches the next step. If a local transaction fails or a business condition is violated, the Saga coordinator executes a series of **compensating transactions** that undo the changes made by preceding local transactions, ensuring eventual business consistency.

---

## 2. Orchestration vs. Choreography

Distributed Sagas can be implemented using two fundamental interaction patterns:

| Architectural Dimension | Orchestrated Saga (Coordinator-Driven) | Choreographed Saga (Event-Driven) |
| :--- | :--- | :--- |
| **Control Model** | Centralized coordinator explicitly commands participants (`POST /commands`). | Decentralized; participants listen to domain events and autonomously react (`MQ events`). |
| **State Visibility** | **Single Source of Truth**: Full workflow state, current step, and error history are persisted in the orchestrator's database. | **Scattered State**: State is dispersed across multiple service databases; tracking transaction progress requires cross-log reconstruction. |
| **Workflow Understandability**| High. The complete business logic is codified in one readable state machine. | Low. The emergent workflow can only be deduced by inspecting all event subscribers. |
| **Cyclic Dependency Risk** | None. Control flows hierarchically from orchestrator to participants. | High. Event chains can form unintended circular feedback loops between services. |
| **Compensation Complexity** | Straightforward. The orchestrator records exactly which steps succeeded and issues targeted compensating calls in reverse order. | Complex. Compensating events must cascade across multiple queues, increasing the risk of unhandled race conditions. |
| **Participant Coupling** | Participants expose standard REST command APIs; they remain unaware of the overarching Saga. | Participants must understand upstream and downstream event schemas and domain semantics. |
| **Failure Debugging** | Immediate. The orchestrator logs the exact participant, request payload, response status, and exception. | Difficult. Requires distributed trace correlation across independent message queues. |

---

## 3. Why Orchestration Is Selected for the Automotive Platform

The Automotive Platform adopts **Orchestrated Sagas** for all multi-service transactional mutations based on four concrete engineering drivers:
1. **Financial & Physical Asset Criticality**: Tire checkout and vehicle sales involve real monetary transactions (Stripe credit card authorization/capture) and physical assets (physical service bays, physical vehicle inventory). The system must maintain an authoritative, auditable record of the exact state of every checkout at all times.
2. **Deterministic Error Handling & Compensations**: If bay reservation fails after stock has been locked, the system must immediately and reliably release that specific stock reservation. An orchestrator executing an explicit compensating sequence is far more reliable and easier to test than an asynchronous chain of compensating events.
3. **Decoupled Participant Services**: Downstream services (`automotive-product`, `store-management`, `appointment`, `vehicle-product`) remain clean, cohesive bounded contexts. They expose idempotent REST endpoints (e.g. `POST /reservations`, `DELETE /reservations/{id}`) without needing to know that they are part of a larger commercial checkout or sales pipeline.
4. **Predictable Latency & Direct Synchronous Feedback**: When a customer clicks "Place Order", the orchestrator executes the reservation steps synchronously within milliseconds, immediately returning a definitive confirmation or a specific conflict message (e.g., "Installation bay 2 is no longer available") rather than forcing the client into indefinite polling.

---

## 4. Why Apache APISIX Is NOT the Saga Orchestrator

> [!IMPORTANT]
> **Approved Decision A**: Apache APISIX is the platform's API Gateway and reverse proxy. It **must never** act as a distributed transaction coordinator or Saga orchestrator.

### The Architectural Boundary Between Gateway and Orchestrator

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        APISIX (API Gateway)                           │
│  - Reverse Proxying & Upstream Load Balancing                          │
│  - TLS Termination & HTTP/2 Ingress                                    │
│  - Client Authentication Verification (JWT validation)                 │
│  - Rate Limiting, CORS, & Request Filtering                            │
│  - Stateless, ephemeral, high-throughput routing engine                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Forward HTTP Request
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Domain Microservice (e.g. automotive-operations)           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Checkout Saga Orchestrator                    │  │
│  │  - Owns commercial business state (Draft -> Authorized -> Paid)  │  │
│  │  - Manages durable state machine in PostgreSQL                   │  │
│  │  - Coordinates participant commands and compensations            │  │
│  │  - Manages payment provider lifecycle & idempotency              │  │
│  │  - Executes recovery after application or network crashes        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

APISIX is designed to be a high-performance, stateless data plane. Placing business workflow orchestration in the gateway via custom OpenResty/Lua plugins would introduce severe anti-patterns:
- **Coupling Routing to Business Logic**: Changes to checkout rules, deposit policies, or compensation logic would require redeploying the ingress gateway.
- **Lack of Relational Persistence**: APISIX uses etcd to store routing configuration, not transactional business state. Attempting to manage transactional Saga state machines in etcd violates its intended purpose and risks state corruption.
- **Violation of Domain Boundaries**: The gateway would become an unauthorized "god service", bypassing the domain models of `automotive-operations` and `vehicle-sales`.

---

## 5. Domain-Specific Saga Ownership: Separation of Concerns

> [!IMPORTANT]
> **Approved Decisions B, C, & D**: The platform enforces decentralized orchestration across distinct business domains. There is no global "orchestration service".

```
                          Client (Web / Mobile)
                                    │
                                    ▼
                        Apache APISIX API Gateway
                                    │
            ┌───────────────────────┴───────────────────────┐
            │                                               │
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     automotive-operations     │               │         vehicle-sales         │
│  ┌─────────────────────────┐  │               │  ┌─────────────────────────┐  │
│  │ Checkout Saga           │  │               │  │ Vehicle Sales Saga      │  │
│  │ Orchestrator            │  │               │  │ Orchestrator            │  │
│  └───────────┬─────────────┘  │               │  └───────────┬─────────────┘  │
└──────────────┼────────────────┘               └──────────────┼────────────────┘
               │                                               │
    ┌──────────┼──────────┐                         ┌──────────┴──────────┐
    ▼          ▼          ▼                         ▼                     ▼
┌───────┐  ┌───────┐  ┌───────┐                 ┌───────┐             ┌───────┐
│Product│  │ Store │  │ Appt  │                 │Vehicle│             │Stripe │
│ (8092)│  │ (8098)│  │ (8097)│                 │Product│             │Deposit│
└───────┘  └───────┘  └───────┘                 │(8094) │             └───────┘
                                                └───────┘
```

### Domain 1: Tire & Parts Checkout Saga (`automotive-operations`)
- **Owner**: `automotive-operations` owns the commercial checkout process for tires, parts, and service labor.
- **Scope**: Validates cart items, coordinates temporary stock holds (`automotive-product`), reserves service bays (`store-management`), schedules tentative appointments (`appointment`), coordinates Stripe payment authorization/capture, and issues the final order and invoice.
- **Independence**: Completely decoupled from vehicle sales.

### Domain 2: Used-Vehicle Sales Saga (`vehicle-sales`)
- **Owner**: `vehicle-sales` owns the sales pipeline, customer deposits, finance applications, and purchase agreements for VIN-specific used vehicles.
- **Scope**: Requests VIN-specific vehicle holds (`vehicle-product`), processes customer holding deposits via Stripe, coordinates digital contract signing, verifies payment/financing, transitions the vehicle to `SOLD`, and schedules vehicle handover.
- **Independence**: Vehicle sales transactions are high-value, multi-day, legally regulated workflows that must not be forced into a high-frequency tire checkout orchestrator.

### Domain 3: Standalone Customer Appointment Coordination (`appointment`)
- **Owner**: `appointment` coordinates standalone service appointments (e.g. seasonal tire swap where the customer already owns the tires, oil changes, brake inspections).
- **Scope**: Coordinates tentative bay holds in `store-management` and confirms the appointment.
- **Hierarchical Relationship with Checkout Saga**:
  - In a standalone appointment, `appointment` coordinates with `store-management`.
  - In a tire purchase with installation, `automotive-operations` owns the master checkout Saga; it calls `store-management` to secure the bay and calls `appointment` to record the appointment details. `appointment` does not spawn an autonomous conflicting nested saga.

---

## 6. Durable Saga State Model

To survive Pod restarts, database failovers, and network partitions, every Saga must persist its state machine transition history in the orchestrator's local PostgreSQL database.

### Proposed Data Structure: `saga_execution_coordinator`

```sql
-- PROPOSED SCHEMA (For Milestone 4 Implementation in automotive-operations and vehicle-sales)
CREATE TABLE saga_instance (
    saga_id              UUID PRIMARY KEY,
    correlation_id       VARCHAR(64) NOT NULL,
    business_id          VARCHAR(64) NOT NULL,           -- e.g. order_id or deal_id
    saga_type            VARCHAR(32) NOT NULL,           -- 'TIRE_CHECKOUT', 'VEHICLE_SALE', etc.
    current_state        VARCHAR(32) NOT NULL,           -- 'CREATED', 'RESERVING', etc.
    current_step         VARCHAR(64) NOT NULL,           -- Name of active step
    step_history         JSONB NOT NULL DEFAULT '[]',    -- Ordered list of executed steps
    participant_data     JSONB NOT NULL DEFAULT '{}',    -- Participant IDs (e.g. reservation_id)
    idempotency_key      VARCHAR(128) NOT NULL UNIQUE,   -- Client request deduplication
    timeout_at           TIMESTAMPTZ NOT NULL,           -- Deadline for current step/saga
    retry_count          INT NOT NULL DEFAULT 0,
    compensation_state   VARCHAR(32) NULL,               -- 'NOT_STARTED', 'COMPENSATING', etc.
    version              BIGINT NOT NULL DEFAULT 0,      -- Optimistic locking for concurrent workers
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saga_lookup ON saga_instance (business_id, saga_type);
CREATE INDEX idx_saga_active_timeout ON saga_instance (current_state, timeout_at) 
    WHERE current_state NOT IN ('COMPLETED', 'COMPENSATED', 'FAILED', 'MANUAL_REVIEW');
```

---

## 7. State Machine & Lifecycle Transitions

A distributed Saga is a finite state machine. Transitions must be atomic, recorded in PostgreSQL, and resilient to failure.

### State Transition Diagram

```
                 [ CREATED ]
                      │
                      ▼
               [ RESERVING ] ───────── (Hold Failed) ──────────┐
                      │                                        │
                      ▼                                        ▼
             [ AWAITING_PAYMENT ] ─── (Payment Failed) ──► [ COMPENSATING ]
                      │                                        │
                      ▼                                        ▼
               [ CONFIRMING ] ──────── (Timeout) ─────► [ PENDING_RECONCILIATION ]
                      │                                        │
                      ▼                                        ▼
               [ COMPLETED ]                             [ COMPENSATED ]
                                                               │
                                                               ▼
                                                      [ MANUAL_REVIEW ] / [ FAILED ]
```

### Detailed State Definitions
- **`CREATED`**: Initialized upon receiving an authenticated client request with an idempotency key.
- **`RESERVING`**: Dispatching tentative resource reservation commands to participants (`automotive-product`, `store-management`).
- **`AWAITING_PAYMENT`**: Resource holds secured; awaiting customer payment authorization or webhook from Stripe.
- **`CONFIRMING`**: Payment authorized/captured; dispatching final confirmation commands to participants.
- **`COMPLETED`**: Terminal success state. All participant allocations confirmed; invoice generated; outbox event emitted.
- **`COMPENSATING`**: A failure occurred (e.g., payment declined or bay hold failed). Actively issuing rollback calls to previously successful participants in reverse order.
- **`COMPENSATED`**: Terminal failure state. All compensations succeeded; customer holds released; no financial or physical resources held.
- **`PENDING_RECONCILIATION`**: A step produced an uncertain outcome (e.g., network timeout during confirmation or payment capture). A background reconciliation worker will query participant status before proceeding.
- **`MANUAL_REVIEW`**: A compensation or confirmation repeatedly failed, or a legally binding contract cannot be automatically rolled back. Alert raised for store manager / support staff.
- **`FAILED`**: Terminal failure state reached after all possible automated actions and compensations have resolved.

---

## 8. Transaction Boundaries & Concurrency Isolation

1. **Local ACID Only**: Every participant executes only local PostgreSQL transactions. No lock is held across HTTP network boundaries.
2. **Preventing Concurrent Saga Execution**: When multiple workers or retried requests attempt to advance the same Saga instance:
   - Database queries use **Optimistic Locking** (`version` column) or atomic row locking (`SELECT FOR UPDATE WHERE saga_id = ?`) to ensure only one worker processes a given Saga step at any instant.
3. **Semantic Isolation & Dirty Reads**: Because Sagas do not hold cross-service locks, intermediate changes are visible to other transactions. The system prevents semantic anomalies using:
   - **Explicit Hold States**: Stock is marked `HELD` (not deducted from on-hand inventory). Other transactions see `available_to_promise = on_hand - (reserved + allocated)` and do not oversell.
   - **Timeouts (TTL)**: If a Saga crashes or is abandoned, tentative holds expire automatically via background janitor jobs.

---

## 9. Idempotency at Every Boundary

Under network retries and at-least-once message delivery, every component must enforce strict idempotency:

```
┌─────────────────┐       Idempotency-Key Header       ┌──────────────────┐
│   Web / Mobile  ├───────────────────────────────────►│  APISIX Gateway  │
└─────────────────┘                                    └────────┬─────────┘
                                                                │ Forward
                                                                ▼
┌─────────────────┐       X-Saga-Step-Id: res_01       ┌──────────────────┐
│  Participant    │◄───────────────────────────────────┤ Saga Orchestrator│
│  (e.g. Product) │                                    │ (Operations)     │
└────────┬────────┘                                    └────────┬─────────┘
         │ Check Unique Key                                     │
         ▼                                                      ▼
   PostgreSQL TX                                          PostgreSQL TX
  (Insert or Ignore)                                    (Update Saga State)
```

1. **Client Request Idempotency**: The client sends `Idempotency-Key: <UUID>` with checkout requests. If the client disconnects and retries, the orchestrator returns the existing active Saga state without re-executing steps.
2. **Orchestrator-to-Participant Idempotency**: The orchestrator sends a deterministic command identifier (`X-Saga-Id`, `X-Saga-Step-Id`) to participants. If a network timeout occurs and the orchestrator retries `POST /inventory/reservations`, the participant recognizes the key and returns the previously created reservation record with HTTP `200 OK`.
3. **Payment Provider Idempotency**: All Stripe API calls pass the `Idempotency-Key` header (e.g., `checkout_sess_<UUID>`). Retrying a charge request will never charge the customer twice.
4. **Asynchronous Consumer Deduplication**: Event listeners (e.g. in `notification`) record processed event UUIDs in a `processed_event_log` table within the local transaction before processing.

---

## 10. Compensation Architecture & Irreversible Steps

### Core Compensation Rules
1. **Compensations Must Be Idempotent**: A compensation call (e.g. `DELETE /inventory/reservations/{resId}`) must succeed with `200 OK` whether called once, twice, or multiple times, even if the reservation was already canceled or expired.
2. **Reverse Execution Order**: Compensations execute in exact reverse order of the successful forward steps.
3. **Irreversible Business Steps**: Not all operations can be rolled back via an automated compensating HTTP call:
   - **Signed Vehicle Purchase Agreement**: Once a contract is signed by both buyer and dealer, it constitutes a legal agreement. If the transaction is canceled subsequently, it requires a legal rescission workflow (`sales.contract.voided`), not a simple database rollback.
   - **Physical Vehicle Delivery**: Once the customer drives the vehicle off the lot, the transaction cannot be "rolled back". Return of the vehicle requires a trade-in, buyback, or customer return workflow.
   - **Captured Payment**: Once funds have settled, a payment cannot be "voided"; it requires an explicit Stripe Refund API call, which incurs processing fees and takes 3–5 business days to settle back to the customer's bank.

---

## 11. Timeouts, Deadlines & Bounded Retry Policies

1. **Step-Level Timeouts**:
   - Synchronous participant calls (`POST /reservations`): Timeout = **3,000 ms**.
   - External Payment Gateway calls (Stripe): Timeout = **5,000 ms**.
2. **Overall Saga Deadline**:
   - Tire Checkout Saga total deadline: **15 minutes** (aligns with the 15-minute tentative bay and stock hold TTL).
   - Vehicle Sales Hold total deadline: **48 hours** (configurable proposed default for holding deposits).
3. **Retry Policy (Resilience4j)**:
   - Max retry attempts: **3**.
   - Backoff strategy: Exponential with jitter ($\text{delay} = \text{initialDelay} \times 2^{\text{attempt}} \pm \text{jitter}$).
   - **Safe Retry Rules**: Retries are permitted only on transient network errors (HTTP 502, 503, 504, connect timeout). Retries are **strictly forbidden** on HTTP 400 (Bad Request), 403 (Forbidden), 404 (Not Found), or 409 (Conflict).

---

## 12. Crash Recovery & Process Resumption

If a service Pod crashes or is terminated by Kubernetes OOMKilled mid-Saga:

```
[ Pod Crashes Mid-Saga ]
         │
         ▼
[ Kubernetes Restarts Pod ]
         │
         ▼
[ Application Startup: SagaRecoveryScanner ]
         │
         ├── 1. Query PostgreSQL: 
         │      SELECT * FROM saga_instance 
         │      WHERE current_state IN ('RESERVING', 'CONFIRMING', 'COMPENSATING')
         │        AND updated_at < NOW() - INTERVAL '30 SECONDS'
         │
         ├── 2. For each stuck Saga:
         │      - Reconcile status with participants using correlation_id
         │      - If uncertain: transition to PENDING_RECONCILIATION
         │      - If participant confirmed: advance to next step
         │      - If participant failed: resume COMPENSATING
         │
         └── 3. If retries exhausted: transition to MANUAL_REVIEW and alert
```

- **Zero In-Memory Volatility**: The orchestrator never keeps critical state only in JVM memory. State is committed to PostgreSQL before every remote HTTP call and immediately after receiving the response.
- **Background Janitor Job (`@Scheduled`)**: A background worker runs every 60 seconds to detect abandoned Sagas where `NOW() > timeout_at`.

---

## 13. Handling Uncertain External Outcomes (Payment & Network Partitions)

When an HTTP call to Stripe or a downstream participant times out, the outcome is **uncertain**:
> *Did the participant commit the reservation and only the HTTP response was lost? Or did the request fail before reaching the participant?*

### The Reconciliation Protocol
1. **Never Blindly Retry Mutating Calls**: The orchestrator must never issue a duplicate charge or new hold without first verifying the status of the in-flight request.
2. **Query Before Compensating**: If confirmation times out, the orchestrator issues a `GET /inventory/reservations/{resId}` or queries the Stripe PaymentIntent by `idempotency_key`.
3. **If Found & Confirmed**: The orchestrator records success and advances to the next step.
4. **If Not Found or Canceled**: The orchestrator marks the step failed and initiates compensation.
5. **If Unreachable After Bounded Retries**: The Saga transitions to `PENDING_RECONCILIATION`. If automatic resolution fails, it moves to `MANUAL_REVIEW`.

---

## 14. Transactional Outbox Integration `[PLANNED]`

When a Saga reaches `COMPLETED`, domain events (e.g. `operations.order.paid`) must be published to RabbitMQ. To avoid the **dual-write problem** (where the database commits the order but the message broker is temporarily offline), the system implements the **Transactional Outbox Pattern**:

```sql
-- Local PostgreSQL Transaction in automotive-operations
BEGIN;
  -- 1. Advance Saga to COMPLETED
  UPDATE saga_instance SET current_state = 'COMPLETED' WHERE saga_id = '...';
  
  -- 2. Update Order to PAID
  UPDATE customer_order SET status = 'PAID' WHERE id = '...';
  
  -- 3. Write integration event to Outbox Table in the SAME transaction
  INSERT INTO transactional_outbox (event_id, event_type, aggregate_type, aggregate_id, payload)
  VALUES (gen_random_uuid(), 'operations.order.paid', 'Order', '...', '{...}');
COMMIT;
```

A dedicated background worker (`OutboxPublisher`) periodically polls `transactional_outbox`, publishes events to RabbitMQ with publisher confirms, and deletes or marks events processed upon broker acknowledgment.

---

## 15. RabbitMQ Messaging Topology `[PLANNED]`

RabbitMQ handles asynchronous, non-blocking side effects after the Saga has committed:
- **Broker Status**: `[PLANNED]` — Not yet deployed in the working tree.
- **Decoupled Consumers**: `notification` consumes events (`operations.order.paid`, `appointment.lifecycle.confirmed`) to dispatch emails and SMS.
- **Reliability Features**:
  - Durable topic exchanges (`operations.events`, `appointment.events`, `sales.events`).
  - Durable queues with Dead-Letter Exchanges (`DLX`) for unprocessable messages.
  - Manual consumer acknowledgments (`basicAck` after processing).
  - Consumer-side deduplication table (`processed_event_log`).

---

## 16. Observability, Tracing & Auditability

1. **W3C Distributed Tracing (`traceparent`)**:
   - APISIX generates or propagates W3C trace context headers:
     `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
   - Spring Boot OpenTelemetry / Micrometer Tracing propagates this header across all synchronous HTTP calls to participants and attaches it to asynchronous Outbox messages.
2. **Structured Correlation Logging**:
   - Every log line across all 8 services outputs:
     `[service=automotive-operations, traceId=4bf92f..., sagaId=9a12..., correlationId=usr_882]`
3. **Audit Trail**:
   - The `saga_instance.step_history` column maintains an immutable JSONB array of timestamps, participant responses, latency measurements, and error codes for every step.

---

## 17. Detailed Failure Scenarios & Edge Cases

| Scenario | Point of Failure | System Response | End State |
| :--- | :--- | :--- | :--- |
| **1. Bay Unavailable** | Step 2 (`store-management`) returns `409 Conflict`. | Orchestrator halts; calls `DELETE /inventory/reservations` on `automotive-product` to release stock. | `COMPENSATED`; Customer informed to select another time slot; 0 holds remain. |
| **2. Card Declined** | Step 4 (Stripe returns `card_declined`). | Orchestrator calls `DELETE` on stock reservation, bay reservation, and appointment. | `COMPENSATED`; Holds released; Customer prompted to use another payment method. |
| **3. Confirmation Timeout** | Step 5 (Network drops during stock confirmation). | Orchestrator enters `PENDING_RECONCILIATION`; background poller queries reservation status. | Once resolved, advances to `COMPLETED` or completes compensation. |
| **4. Compensation Fails** | Participant is down while orchestrator tries to release hold. | Orchestrator retries with exponential backoff up to 5 times. If still failing, transitions to `MANUAL_REVIEW`. | `MANUAL_REVIEW`; Admin dashboard alerts store manager; TTL janitor releases hold eventually. |
| **5. Orchestrator Pod Dies** | Container crashes while awaiting payment. | Pod restarts; recovery scanner finds active saga in `AWAITING_PAYMENT`; waits for webhook or timeout. | Correctly processes webhook or initiates compensation upon TTL expiry. |

---

## 18. Testing Strategy for Saga Orchestrators

Testing distributed transaction workflows requires a multi-tiered verification suite:
1. **Unit Testing (State Machine & Logic)**:
   - Mock participant HTTP clients using WireMock or Mockito.
   - Verify that state transitions conform strictly to the state machine rules.
   - Verify that compensation is invoked in exact reverse order upon simulated step failure.
2. **Integration Testing (Testcontainers & Spring Boot)**:
   - Run tests against a real PostgreSQL container managed by Testcontainers.
   - Verify that saga records, step histories, and transactional outbox rows commit atomically.
   - Test concurrency: Fire concurrent requests with identical idempotency keys; assert exactly one saga executes.
3. **Chaos & Fault Injection Testing**:
   - Inject network timeouts (simulate 10-second latency on Stripe mock).
   - Inject simulated HTTP 500/503 errors from participant containers.
   - Inject container termination (`kill -9`) mid-saga and verify recovery scanner resumes processing.

---

## 19. Operational Complexity & Support Overhead

Operating distributed Sagas introduces real engineering overhead:
- **Eventual Consistency Window**: Between reserving stock and capturing payment (typically 1–30 seconds), stock is held but not yet paid. Operations teams must understand that holds are normal in-flight states.
- **Monitoring Abandoned Sagas**: Operations dashboards must track the number of Sagas in `PENDING_RECONCILIATION` and `MANUAL_REVIEW`. A persistent spike indicates a downstream participant or payment gateway outage.
- **Manual Intervention Runbook**: Provide store managers and platform support with a secure UI to view stuck Sagas, manually retry compensations, or release orphaned resource holds.

---

## 20. When to Consider a Dedicated Workflow Engine (Future Evolution)

The custom Spring Boot state machine approach is ideal for our medium-scale baseline (15–50 stores, < 10 checkout sagas/second). However, the platform should re-evaluate transitioning to a dedicated workflow engine (such as **Temporal** or **Camunda 8**) if and when the following criteria are met:
1. **Long-Running Multi-Day Sagas**: If the used-vehicle sales workflow introduces complex multi-day asynchronous human-in-the-loop steps (e.g., 7-day financing approvals, insurance verification, manual DMV title processing).
2. **High Scale**: Transaction volume exceeds 1,000 active concurrent Sagas per second, making PostgreSQL polling inefficient.
3. **Workflow Proliferation**: The number of cross-service workflows expands beyond 10 distinct orchestrations, making custom state machine maintenance burdensome.

---

## 21. References & Authoritative Sources

1. **Microsoft Azure Architecture Center**: *Saga Distributed Transactions Pattern* (https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)
2. **AWS Architecture Blog**: *Building resilient distributed systems using the Saga and Outbox patterns* (https://aws.amazon.com/blogs/compute/building-resilient-distributed-systems-using-the-saga-and-outbox-patterns/)
3. **PostgreSQL Official Documentation**: *Explicit Locking and Concurrency Control* (https://www.postgresql.org/docs/current/explicit-locking.html)
4. **RabbitMQ Documentation**: *Publisher Confirms and Consumer Acknowledgments* (https://www.rabbitmq.com/docs/confirms)
5. **Stripe Developer Documentation**: *Idempotent Requests and Webhook Security* (https://stripe.com/docs/api/idempotent_requests)
6. **Enterprise Integration Patterns**: *Process Manager & Compensating Transaction* (Gregor Hohpe, Bobby Woolf)
