# Notification Service (`notification`) — Capability & Architecture Blueprint

> **Service Status**: Skeletons & Health Endpoint `[EXISTING]`; Business Logic & Flyway Migrations `[PLANNED]`  
> **Port**: `8095`  
> **Key Architectural Authority**: Independent microservice database; decoupled asynchronous consumer. Delivery failures **must never** roll back upstream business transactions.

---

## A. Service Overview

### 1. Business Purpose & Scope
The `notification` microservice is the central multi-channel communication engine for the Automotive Platform. It manages customer communication preferences, multi-lingual message templates (Email, SMS, Mobile Push), delivery provider abstraction (AWS SES / SendGrid, Twilio, Firebase Cloud Messaging), delivery attempt logging, provider status webhooks, exponential backoff retries, and dead-letter queue (DLQ) processing.

### 2. Owned Domain Entities
- **Notification Template**: Localized templates with parameter placeholders for Email (HTML/Text), SMS, and Mobile Push.
- **Notification Job**: Inbound dispatch request record, recipient, channel, rendered payload, delivery status (`QUEUED`, `SENDING`, `SENT`, `FAILED`, `DEAD_LETTER`).
- **Delivery Attempt Log**: Immutable log of each provider call, HTTP status codes, provider message IDs, latency, and error descriptions.
- **Communication Preference**: Customer opt-in/opt-out preferences per channel and notification type (Marketing, Transactional, Service Reminders).
- **Processed Event Log**: Consumer deduplication table preventing duplicate message delivery under RabbitMQ redelivery.

### 3. Owned Business Capabilities
- Asynchronous message consumption from RabbitMQ domain topic exchanges.
- Template rendering with dynamic variable interpolation.
- Multi-channel delivery routing (Email, SMS, Push).
- Customer preference enforcement (suppressing opted-out marketing messages; mandatory transactional receipts).
- Bounded retries with exponential backoff and DLQ routing.
- Provider webhook callback ingestion (delivery receipts, bounce tracking).

### 4. Primary Consumers & Authorized Actors
- **Consumers**:
  - RabbitMQ Topic Exchanges: Asynchronously dispatches events from `automotive-operations`, `vehicle-sales`, and `appointment`.
  - Next.js Admin Dashboard: Audits notification delivery logs and manages message templates.
- **Authorized Actors**:
  - `customer`: Manages communication preferences.
  - `store_manager`: Views delivery logs for customer order receipts.
  - `super_admin`: Creates and updates localized message templates.

### 5. Service Dependencies
- **Downstream Services Consumed**: None. `notification` is a pure leaf consumer.
- **External Dependencies**:
  - Email Provider: AWS SES / SendGrid API.
  - SMS Provider: Twilio API.
  - Push Provider: Firebase Cloud Messaging (FCM).

### 6. Events Published & Consumed `[PLANNED via RabbitMQ]`
- **Events Published**:
  - `notification.delivery.bounced` (v1)
- **Events Consumed**:
  - `operations.order.paid` (v1)
  - `operations.order.cancelled` (v1)
  - `sales.deposit.received` (v1)
  - `sales.transaction.completed` (v1)
  - `appointment.lifecycle.confirmed` (v1)
  - `appointment.lifecycle.rescheduled` (v1)
  - `appointment.lifecycle.cancelled` (v1)

### 7. Data Consistency & Invariants
- **Decoupled Asynchronous Processing**: The notification service operates completely asynchronously. If SendGrid or Twilio is down, user checkouts, payments, and appointments continue without degradation.
- **At-Least-Once Delivery & Deduplication**: Consumed message UUIDs are recorded in `processed_event_log`. Duplicate messages from RabbitMQ are acknowledged immediately and discarded.

---

## B. Internal Module Decomposition

### 1. Template Management Module
- **Responsibility**: Manages localized templates, subject lines, markdown/HTML rendering, and variable syntax.
- **Owned Data**: `notification_template`.

### 2. Delivery Dispatcher Module
- **Responsibility**: Asynchronously consumes events, evaluates customer channels, renders payloads, and invokes external provider adapters.
- **Owned Data**: `notification_job`.

### 3. Preferences Module
- **Responsibility**: Manages customer opt-out settings and compliance (CAN-SPAM, TCPA regulations).
- **Owned Data**: `communication_preference`.

### 4. Reliability & DLQ Module
- **Responsibility**: Tracks delivery attempt logs, manages exponential backoff retries, and moves unprocessable messages to Dead-Letter Queues.
- **Owned Data**: `delivery_attempt_log`, `processed_event_log`.

---

## C. Comprehensive Activity Catalog

| Activity ID | Activity Name | Module | Initiator / Trigger | Transaction Boundary | Consistency | Concurrency Control | Authorization | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-NOT-001** | Create Message Template | Template | `super_admin` | Local Service TX | Strong | Template Code Unique | `super_admin` | MVP | Proposed |
| **ACT-NOT-002** | Update Message Template Content | Template | `super_admin` | Local Service TX | Strong | Optimistic `@Version` | `super_admin` | MVP | Proposed |
| **ACT-NOT-003** | Consume Domain Event & Queue Job | Dispatcher | RabbitMQ Listener | Local TX (`job` + `inbox`) | Strong | Unique `event_id` Inbox | System / MQ | MVP | Proposed |
| **ACT-NOT-004** | Dispatch Transactional Email | Dispatcher | Async Dispatcher Worker | Local Service TX + SES API | Eventual | Job Status Check | System | MVP | Proposed |
| **ACT-NOT-005** | Dispatch Transactional SMS | Dispatcher | Async Dispatcher Worker | Local Service TX + Twilio | Eventual | Job Status Check | System | MVP | Proposed |
| **ACT-NOT-006** | Dispatch Mobile Push Notification | Dispatcher | Async Dispatcher Worker | Local Service TX + FCM | Eventual | Job Status Check | System | Next | Proposed |
| **ACT-NOT-007** | Ingest Provider Delivery Webhook | Reliability | External Provider Callback| Local Service TX | Strong | Provider Message ID | Webhook Sig | MVP | Proposed |
| **ACT-NOT-008** | Retry Failed Notification (DLQ) | Reliability | `@Scheduled` Retry Worker | Local Batch TX | Eventual | Retry Limit Counter | System | MVP | Proposed |
| **ACT-NOT-009** | Update Communication Preferences | Preferences | Customer on Web / Mobile | Local Service TX | Strong | Customer ID Unique | `customer` | MVP | Proposed |
