# Microservice Architecture Specification: `vehicle-sales`

> **Service Identity**: `vehicle-sales` (Port 8093)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-B-R2)
> **Primary Authority**: Used-Vehicle Deals, Test Drives, Holding Deposits, Sales Sagas & Digital Purchase Contracting
> **Storage**: PostgreSQL (deals, deposits, digital contracts, trade-ins, outbox)
> **Consolidated Modules**: 2 Substantive Modules
> **Total Activities Owned**: 7 Activities (`ACT-SAL-001` through `ACT-SAL-007`)
> **Total Unique HTTP Endpoints**: 7 Endpoints

---

## 1. Domain Boundary & Module Architecture

`vehicle-sales` manages used-vehicle sales negotiations, holding deposits, and legal purchase contracts, operating completely independently from tire e-commerce.

```
vehicle-sales (Port 8093)
├── pipeline/      # MODULE 1: Sales Pipeline & Deal Management Module (1 activity: ACT-SAL-001)
└── contracting/   # MODULE 2: Vehicle Sales Saga & Contracting Module (6 activities: ACT-SAL-002..ACT-SAL-007)
```

---

## 2. Activity Catalog & API Contracts by Module

### 2.1 Module 1: Sales Pipeline & Deal Management Module
- **ACT-SAL-001**: Capture Customer Sales Inquiry & Schedule Test Drive
  - **HTTP Method & Path**: `POST /api/v1/vehicles/sales/deals` (Visibility: CUSTOMER / STAFF)
  - **Request Body**: `{ "vin": "1FTFW1E8...", "customer_id": "...", "scheduled_test_drive": "2026-11-26T10:00:00Z" }`
  - **Response**: `201 Created` with deal ID. | SLO: < 45 ms.

---

### 2.2 Module 2: Vehicle Sales Saga & Contracting Module
- **ACT-SAL-002**: Request Vehicle Deposit Hold
  - **HTTP Method & Path**: `POST /api/v1/vehicles/sales/deals/{id}/hold` (Visibility: CUSTOMER)
  - **Algorithm**: RPC to `vehicle-product` (:8094) `POST /api/v1/vehicles/inventory/{vin}/hold` placing 72h hold. | SLO: < 90 ms.
- **ACT-SAL-003**: Process Vehicle Holding Deposit Payment
  - **HTTP Method & Path**: `POST /api/v1/vehicles/sales/deals/{id}/deposit` (Visibility: CUSTOMER)
  - **Request Body**: `{ "payment_method_id": "pm_...", "deposit_amount_cents": 50000 }`
  - **Algorithm**: Charges $500 holding deposit via Stripe; idempotent. | SLO: < 180 ms.
- **ACT-SAL-004**: Generate State-Mandated Sales Contract & Disclosures
  - **HTTP Method & Path**: `POST /api/v1/vehicles/sales/deals/{id}/contract` (Visibility: STAFF)
  - **Algorithm**: Merges vehicle inspection, odometer disclosure, and truth-in-lending disclosure into digital agreement. | SLO: < 250 ms.
- **ACT-SAL-005**: Finalize Vehicle Sale Contract & Digital Signature
  - **HTTP Method & Path**: `POST /api/v1/vehicles/sales/deals/{id}/sign` (Visibility: CUSTOMER)
  - **Algorithm**: Captures customer digital signature; creates legally binding contract. | SLO: < 150 ms.
- **ACT-SAL-006**: Execute Vehicle Sales Cancellation & Refund Deposit
  - **HTTP Method & Path**: `POST /api/v1/vehicles/sales/deals/{id}/cancel` (Visibility: CUSTOMER / STAFF)
  - **Algorithm**: Refunds $500 deposit; calls `vehicle-product` to release VIN hold. | SLO: < 120 ms.
- **ACT-SAL-007**: Complete Vehicle Physical Handover & Odometer Log
  - **HTTP Method & Path**: `POST /api/v1/vehicles/sales/deals/{id}/handover` (Visibility: STAFF)
  - **Algorithm**: Verifies delivery odometer; marks deal `DELIVERED`; calls `vehicle-product` `POST /inventory/{vin}/sold` permanently marking VIN `SOLD`. | SLO: < 80 ms.
