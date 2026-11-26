# Microservice Architecture Specification: `notification`

> **Service Identity**: `notification` (Port 8095)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-B-R2)
> **Primary Authority**: Multi-Channel Delivery (SMS, Email, Push), Templates, Preferences & Regulatory Audits
> **Storage**: PostgreSQL (templates, delivery logs, preferences) + RabbitMQ Consumer Engine
> **Consolidated Modules**: 2 Substantive Modules
> **Total Activities Owned**: 9 Activities (`ACT-NOT-001` through `ACT-NOT-009`)
> **Total Unique HTTP Endpoints**: 7 Endpoints (7 HTTP routes + 1 background daemon + 1 event consumer)

---

## 1. Domain Boundary & Module Architecture

`notification` provides decoupled, asynchronous customer messaging. Notification delivery failure never aborts an underlying business transaction.

```
notification (Port 8095)
├── delivery/      # MODULE 1: Messaging & Multi-Channel Delivery Module (6 activities: ACT-NOT-003..ACT-NOT-008)
└── governance/    # MODULE 2: Notification Governance & Preferences Module (3 activities: ACT-NOT-001, 002, 009)
```

---

## 2. Activity Catalog & API Contracts by Module

### 2.1 Module 1: Messaging & Multi-Channel Delivery Module
- **ACT-NOT-003**: Dispatch Transactional SMS Notification (`POST /api/v1/notifications/sms`) | Twilio / Telnyx adapter | SLO: < 200 ms.
- **ACT-NOT-004**: Dispatch Transactional Email Notification (`POST /api/v1/notifications/email`) | SendGrid / AWS SES adapter | SLO: < 250 ms.
- **ACT-NOT-005**: Dispatch Mobile Push Notification (`POST /api/v1/notifications/push`) | Firebase FCM / Apple APNs | SLO: < 180 ms.
- **ACT-NOT-006**: Consume Domain Event from Message Broker (`@RabbitListener`) | Claims `notification.consumer_inbox` `(consumer_name, event_id)` inside local SQL TX; manual ACK only after commit; 5 total broker delivery attempts (1 + 4 delayed) before quarantine DLQ.
- **ACT-NOT-007**: Ingest Delivery Status Webhook from Carrier (`POST /api/v1/notifications/carrier-webhook`) | Carrier callback | SLO: < 60 ms.
- **ACT-NOT-008**: Execute Dead-Letter Queue (DLQ) Retry (`NO HTTP ENDPOINT`) | `NotificationRetryWorker` with exponential backoff (broker DLQ quarantine/replay per `P1-DEC-05`; provider delivery retry counts finalized in Part 10).

---

### 2.2 Module 2: Notification Governance & Preferences Module
- **ACT-NOT-001**: Register Notification Template (`POST /api/v1/notifications/templates`) | Mustache template engine | SLO: < 70 ms.
- **ACT-NOT-002**: Manage Customer Communication Preferences (`PUT /api/v1/notifications/preferences`) | Channel opt-ins | SLO: < 45 ms.
- **ACT-NOT-009**: Audit Customer Notification Delivery History (`GET /api/v1/notifications/history`) | Regulatory audit logs | SLO: < 50 ms.
