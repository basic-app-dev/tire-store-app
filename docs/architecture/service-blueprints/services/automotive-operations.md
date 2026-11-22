# Automotive Operations Service (`automotive-operations`) — Capability & Architecture Blueprint

> **Service Status**: Skeletons & Health Endpoint `[EXISTING]`; Business Logic & Flyway Migrations `[PLANNED]`  
> **Port**: `8091`  
> **Key Architectural Authority**: Approved Decision B (Owns Tire Checkout Saga); Approved Decision A (APISIX is NOT an orchestrator).

---

## A. Service Overview

### 1. Business Purpose & Scope
The `automotive-operations` microservice is the central commercial engine and transaction orchestrator for retail automotive operations. It manages customer orders, orchestrates distributed checkout sessions across downstream services (inventory, service bays, appointments, payments), generates and maintains invoices, coordinates payment gateway interactions (Stripe), tracks technician service jobs (work orders), and manages retail order fulfillment.

### 2. Owned Domain Entities
- **Automotive Order**: Commercial agreement representing customer purchase of physical products (tires/parts) and/or service installations.
- **Order Line Item**: Specific SKU, quantity, quoted price, and optional service labor charge (stores immutable price snapshot).
- **Checkout Session / Saga Instance**: Ephemeral distributed transaction state tracking multi-step checkout execution.
- **Payment Record & Transaction**: Record of payment intent, authorization, capture, failure, or refund.
- **Invoice & Credit Note**: Legal accounting artifact generated upon successful order capture.
- **Work Order (Service Job)**: Operational ticket tracking technician labor, bay assignment, parts consumed, and status from check-in to completion.
- **Fulfillment Record**: Store pickup, technician installation, or shipment fulfillment status.

### 3. Owned Business Capabilities
- Commercial order lifecycle management (`DRAFT`, `SUBMITTED`, `AUTHORIZED`, `PAID`, `IN_SERVICE`, `FULFILLED`, `CANCELLED`, `REFUNDED`).
- Distributed Checkout Saga Orchestration coordinating atomic inventory holds, bay holds, appointment bookings, and payment authorization.
- Resilient payment gateway integration (Stripe payment intents, webhooks, idempotency).
- Invoicing, credit memos, and financial audit history.
- Workshop service execution management via Work Orders.
- Customer fulfillment tracking.

### 4. Primary Consumers & Authorized Actors
- **Consumers**:
  - `apps/web` & `apps/mobile`: Customer checkout submission, order tracking, invoice downloads.
  - Next.js Admin Dashboard: Store technician work order board, cashier checkout, order fulfillment.
- **Authorized Actors**:
  - `customer`: Submits checkout, views own orders, initiates order cancellation (if unfulfilled).
  - `shop_worker`: Updates work order execution stages, logs parts consumption, marks job complete.
  - `store_manager`: Approves order refunds, manages branch work order queues, reviews invoices.
  - `super_admin`: Global order adjustments, system-wide financial reporting.

### 5. Service Dependencies
- **Downstream Services Consumed during Checkout Saga**:
  - `automotive-product`: Requests temporary stock reservation; confirms allocation on payment; releases reservation on failure.
  - `store-management`: Validates store capabilities; coordinates bay reservation when installation is requested.
  - `appointment`: Books appointment slot when installation is requested.
  - `notification` `[PLANNED]`: Consumes asynchronous order confirmation and invoice events.
- **External Dependencies**:
  - Stripe API (PaymentIntents, Webhook dispatch).

### 6. Events Published & Consumed `[PLANNED via Outbox]`
- **Events Published**:
  - `operations.order.created` (v1)
  - `operations.order.paid` (v1)
  - `operations.order.cancelled` (v1)
  - `operations.order.fulfilled` (v1)
  - `operations.workorder.status_changed` (v1)
- **Events Consumed**:
  - `appointment.lifecycle.cancelled` (v1): Triggers work order cancellation / compensation.

### 7. Data Consistency & Transaction Expectations
- **Local Consistency**: Orders, line items, payment records, invoice generation, and outbox event writes are strictly ACID within the `automotive-operations` PostgreSQL database.
- **Cross-Service Consistency**: Achieved via an **Orchestrated Saga Pattern**. If downstream bay booking or payment fails, the orchestrator triggers compensating transactions (releasing stock reservations and bay holds). Distributed two-phase commit (XA) is strictly prohibited.
- **Payment Consistency**: Financial transaction state is separated from order state. Payment authorization occurs first; capture and settlement are coordinated with final allocation confirmation.

---

## B. Internal Module Decomposition

### 1. Order Module
- **Responsibility**: Manages the core order entity, order items, status transitions, cancellations, and order history.
- **Owned Data**: `customer_order`, `order_item`, `order_status_history`.

### 2. Checkout Saga Orchestrator Module
- **Responsibility**: Implements the stateful orchestrator coordinating the multi-step checkout workflow across microservices: Stock Reservation (`automotive-product`) ➔ Bay Reservation (`store-management`) ➔ Appointment Creation (`appointment`) ➔ Payment Intent Authorization (Stripe). Handles timeout compensation and crash recovery.
- **Owned Data**: `saga_instance`, `saga_step_history`.

### 3. Payment & Billing Module
- **Responsibility**: Manages payment authorization, capture, refunds, webhook verification with idempotency protection, invoice PDF metadata, and credit notes.
- **Owned Data**: `payment_transaction`, `invoice`, `credit_note`, `processed_webhook_event`.

### 4. Work Order Module
- **Responsibility**: Tracks workshop service execution. Converts paid service orders into actionable technician tickets, records technician notes, labor duration, parts consumption, and final vehicle handover.
- **Owned Data**: `work_order`, `work_order_item`, `work_order_log`.

### 5. Fulfillment Module
- **Responsibility**: Manages physical goods handover, store customer pickup verification (pickup PIN / signature), and partial fulfillment tracking.
- **Owned Data**: `order_fulfillment`, `fulfillment_item`.

---

## C. Comprehensive Activity Catalog

| Activity ID | Activity Name | Module | Initiator / Trigger | Transaction Boundary | Consistency | Concurrency Control | Authorization | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-OPS-001** | Create Draft Order & Calculate Total | Order | Customer / Web / Mobile | Local Service TX | Strong | Client Session Token | `customer` | MVP | Proposed |
| **ACT-OPS-002** | Submit Checkout Session | Checkout | Customer Clicks "Pay" | Local Session TX + Saga | Eventual across services | Idempotency Key | `customer` | MVP | Proposed |
| **ACT-OPS-003** | Execute Checkout Stock Hold Step | Checkout | Saga Orchestrator | Sync REST to `automotive-product` | Strong at target | `X-Saga-Step-Id` | System / Token | MVP | Proposed |
| **ACT-OPS-004** | Execute Checkout Bay Hold Step | Checkout | Saga Orchestrator | Sync REST to `store-management` | Strong at target | `X-Saga-Step-Id` | System / Token | MVP | Proposed |
| **ACT-OPS-005** | Execute Checkout Appointment Step | Checkout | Saga Orchestrator | Sync REST to `appointment` | Strong at target | Booking Reference | System / Token | MVP | Proposed |
| **ACT-OPS-006** | Authorize Payment via Payment Provider | Payment | Saga Orchestrator | External REST to Stripe | Strong at Gateway | Stripe Idempotency Key | System / Token | MVP | Proposed |
| **ACT-OPS-007** | Process Payment Webhook Idempotently | Payment | Stripe Webhook Callback | Local TX (`payment` + `processed_webhook`) | Strong | Unique Constraint on `webhook_event_id` | Webhook Sig | MVP | Proposed |
| **ACT-OPS-008** | Finalize Order & Generate Invoice | Order/Billing | Successful Payment Webhook | Local TX (`order` + `invoice` + `outbox`) | Strong | Optimistic `@Version` | System / Token | MVP | Proposed |
| **ACT-OPS-009** | Execute Saga Compensation on Failure | Checkout | Checkout Timeout / Error | Outbox / Sync REST to peers | Eventual | Idempotent releases | System / Token | MVP | Proposed |
| **ACT-OPS-010** | Generate Work Order from Paid Order | Work Order | Order Paid Event | Local Service TX | Strong | Order ID Unique | System / Token | MVP | Proposed |
| **ACT-OPS-011** | Assign Technician to Work Order | Work Order | `store_manager` | Local Service TX | Strong | Optimistic `@Version` | `store_manager` | Next | Proposed |
| **ACT-OPS-012** | Update Work Order Execution Stage | Work Order | `shop_worker` | Local Service TX | Strong | Optimistic `@Version` | `shop_worker` | Next | Proposed |
| **ACT-OPS-013** | Record Consumed Parts & Labor Time | Work Order | `shop_worker` | Local Service TX | Strong | Optimistic `@Version` | `shop_worker` | Next | Proposed |
| **ACT-OPS-014** | Complete Work Order & Vehicle Handover | Work Order | `shop_worker` | Local Service TX + Outbox | Strong | Status Precondition | `shop_worker` | Next | Proposed |
| **ACT-OPS-015** | Cancel Order & Process Customer Refund | Order/Payment | Customer / Store Manager | Local TX + Stripe Refund | Strong | Status Precondition | `store_manager` | MVP | Proposed |
| **ACT-OPS-016** | Verify In-Store Customer Pickup PIN | Fulfillment | Store Cashier | Local Service TX | Strong | Verification Token | `shop_worker` | MVP | Proposed |
