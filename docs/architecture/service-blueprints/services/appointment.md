# Appointment Service (`appointment`) — Capability & Architecture Blueprint

> **Service Status**: Skeletons & Health Endpoint `[EXISTING]`; Business Logic & Flyway Migrations `[PLANNED]`  
> **Port**: `8097`  
> **Key Architectural Authority**: Approved Decision D (Coordinates Standalone Customer Appointments; Participant in Checkout Saga).

---

## A. Service Overview

### 1. Business Purpose & Scope
The `appointment` microservice is the authoritative domain owner for the customer service appointment lifecycle. It manages customer scheduling requests, appointment confirmations, rescheduling requests, cancellations, technician check-in records, and customer calendar passes (Apple Wallet / Google Wallet `.ics` files). It coordinates with `store-management` to secure exclusive physical service bay reservations.

### 2. Owned Domain Entities
- **Service Appointment**: Customer booking record, scheduled start/end times, service type (tire installation, oil change, wheel alignment), status (`TENTATIVE`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
- **Appointment Line Item**: Specific service activities or requested customer inspection notes.
- **Appointment History Log**: Immutable chronological audit of state transitions and reschedules.
- **Calendar Pass Artifact**: Dynamic iCalendar (`.ics`) file metadata and tokenized pass URLs.

### 3. Owned Business Capabilities
- Customer self-service appointment scheduling and slot selection.
- Standalone appointment coordination with `store-management` bay holds.
- Participant booking in checkout sagas orchestrated by `automotive-operations`.
- Technician vehicle check-in and customer arrival logging.
- Rescheduling coordination (secures new bay hold before releasing old hold).
- Dynamic calendar pass (`.ics`) generation for mobile wallet integration.

### 4. Primary Consumers & Authorized Actors
- **Consumers**:
  - `apps/web` & `apps/mobile`: Customer booking screens, appointment detail views.
  - `automotive-operations`: Creates tentative appointment during checkout; confirms upon payment.
- **Authorized Actors**:
  - `customer`: Books, reschedules, or cancels own appointments.
  - `shop_worker`: Marks vehicle arrival / check-in.
  - `store_manager`: Overrides booking schedules, handles walk-in appointments.
  - `super_admin`: Global appointment analytics.

### 5. Service Dependencies
- **Downstream Services Consumed**:
  - `store-management`: Validates store hours; coordinates exclusive physical bay reservation.
  - `notification` `[PLANNED]`: Consumes appointment confirmation, reschedule, and cancellation events.

### 6. Events Published & Consumed `[PLANNED via Outbox]`
- **Events Published**:
  - `appointment.lifecycle.created` (v1)
  - `appointment.lifecycle.confirmed` (v1)
  - `appointment.lifecycle.rescheduled` (v1)
  - `appointment.lifecycle.cancelled` (v1)
  - `appointment.lifecycle.checked_in` (v1)

### 7. Data Consistency & Invariants
- **Coordination Without Distributed 2PC**:
  - In standalone appointments, `appointment` calls `store-management` to secure an exclusive bay hold. If appointment insertion succeeds, both are confirmed. If appointment insertion fails, the bay hold is released immediately.
  - In checkout sagas, `appointment` acts as a participant under `automotive-operations`. It creates a `TENTATIVE` appointment record bound to the checkout saga's bay reservation, advancing to `CONFIRMED` upon payment confirmation.

---

## B. Internal Module Decomposition

### 1. Appointment Lifecycle Module
- **Responsibility**: Manages appointment states, transitions, check-in, completion, and cancellation.
- **Owned Data**: `service_appointment`, `appointment_status_history`.

### 2. Customer Scheduling Module
- **Responsibility**: Validates customer booking requests, customer garage vehicle associations, and store business rules.
- **Owned Data**: `appointment_request`.

### 3. Booking Coordination Module
- **Responsibility**: Manages synchronous command calls to `store-management` for physical bay reservations, and handles rollback if booking fails.
- **Owned Data**: `bay_reservation_link`.

### 4. Calendar & Pass Module
- **Responsibility**: Generates standard iCalendar (`.ics`) files and mobile wallet pass metadata.

---

## C. Comprehensive Activity Catalog

| Activity ID | Activity Name | Module | Initiator / Trigger | Transaction Boundary | Consistency | Concurrency Control | Authorization | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-APT-001** | Create Tentative Appointment | Scheduling | Customer / Checkout Saga | Local Service TX | Strong | Client Session Token | `customer` | MVP | Proposed |
| **ACT-APT-002** | Confirm Appointment | Lifecycle | Saga Orchestrator / Payment | Local Service TX + Outbox | Strong | Status Precondition | System / Token | MVP | Proposed |
| **ACT-APT-003** | Reschedule Appointment | Scheduling | Customer / Mobile App | Local TX + Remote Bay Hold | Strong | Optimistic `@Version` | `customer` | MVP | Proposed |
| **ACT-APT-004** | Cancel Appointment | Lifecycle | Customer / Store Manager | Local TX + Remote Bay Release| Strong | Status Precondition | `customer` | MVP | Proposed |
| **ACT-APT-005** | Check In Customer Vehicle | Lifecycle | `shop_worker` at Store | Local Service TX + Outbox | Strong | Optimistic `@Version` | `shop_worker` | MVP | Proposed |
| **ACT-APT-006** | Complete Service Appointment | Lifecycle | `shop_worker` at Handover | Local Service TX + Outbox | Strong | Status Precondition | `shop_worker` | MVP | Proposed |
| **ACT-APT-007** | Generate iCalendar (.ics) Pass | Calendar | Public Web / Mobile | Read-Only Local TX | Strong | Pass Token | Public | MVP | Proposed |
| **ACT-APT-008** | List Daily Store Schedule | Lifecycle | Store Technician Portal | Read-Only Local TX | Strong | B-Tree Date Scan | `shop_worker` | MVP | Proposed |
| **ACT-APT-009** | Record Customer No-Show | Lifecycle | Store Manager | Local Service TX + Outbox | Strong | Status Precondition | `store_manager` | Next | Proposed |
