# Vehicle Sales Service (`vehicle-sales`) — Capability & Architecture Blueprint

> **Service Status**: Skeletons & Health Endpoint `[EXISTING]`; Business Logic & Flyway Migrations `[PLANNED]`  
> **Port**: `8093`  
> **Key Architectural Authority**: Approved Decision C (Owns Used-Car Sales Saga); Approved Decision A (APISIX is NOT an orchestrator).

---

## A. Service Overview

### 1. Business Purpose & Scope
The `vehicle-sales` microservice is the authoritative domain owner for the commercial sales process of used vehicles. It manages sales leads, customer test-drive inquiries, price negotiations, buyer deposits, purchase agreements, financing disclosures, trade-in valuations, and final vehicle sales transaction coordination. It coordinates with `vehicle-product` to hold physical vehicles and mark them sold upon contract execution.

### 2. Owned Domain Entities
- **Sales Lead / Deal**: Customer negotiation record associated with a specific vehicle listing.
- **Vehicle Deposit**: Monetary holding deposit (proposed default: $500 [configurable policy]) securing a vehicle for up to 48 hours [configurable policy].
- **Sales Agreement / Contract**: Legally binding vehicle purchase agreement including line-item purchase price, documentation fees, state sales tax, title/registration fees, and trade-in credits.
- **Buyer Disclosure**: Federally mandated and state-specific disclosure forms (Odometer Disclosure, As-Is Warranty / Buyer's Guide).
- **Vehicle Handover Record**: Physical delivery checklist and final customer acceptance sign-off.
- **Vehicle Sales Saga Instance**: Durable state machine tracking deposit and contract progression.

### 3. Owned Business Capabilities
- Sales pipeline and deal tracking (`INQUIRY` ➔ `TEST_DRIVE` ➔ `DEPOSIT_PAID` ➔ `FINANCING_APPROVED` ➔ `CONTRACT_SIGNED` ➔ `DELIVERED`).
- Customer deposit processing via Stripe payment integration.
- Automated vehicle hold coordination with `vehicle-product`.
- Bill of Sale, purchase agreement, and disclosure document generation.
- Trade-in vehicle credit deduction calculation.
- Final sales handover and completion tracking.

### 4. Primary Consumers & Authorized Actors
- **Consumers**:
  - `apps/web` & `apps/mobile`: Customer deposit checkout, view purchase contract, schedule test drive.
  - Store Sales Desk: Deal desk dashboard, sales reps, finance managers.
- **Authorized Actors**:
  - `customer`: Places deposit on a vehicle, signs digital sales agreement.
  - `shop_worker` / Sales Rep: Manages leads, conducts test drives, drafts purchase agreements.
  - `store_manager` / Finance Mgr: Approves discounts, finalizes sales contracts, processes deposit refunds.
  - `super_admin`: System-wide vehicle revenue analytics and compliance audit.

### 5. Service Dependencies
- **Downstream Services Consumed**:
  - `vehicle-product`: Validates vehicle availability; requests atomic vehicle hold; marks vehicle permanently sold.
  - `notification` `[PLANNED]`: Consumes deal updates, deposit receipts, and contract signature links.
  - External: Stripe API (for credit card deposit transactions).

### 6. Events Published & Consumed `[PLANNED via Outbox]`
- **Events Published**:
  - `sales.deposit.received` (v1)
  - `sales.deposit.refunded` (v1)
  - `sales.contract.signed` (v1)
  - `sales.transaction.completed` (v1)
- **Events Consumed**:
  - `vehicle.inventory.sold` (v1): Closes competing open leads on the same vehicle.

### 7. Data Consistency & Transaction Expectations
- **Strict Immediate Consistency (ACID)**: Deposit transactions, sales contract amounts, and contract state transitions are strictly ACID within the `vehicle-sales` database.
- **Cross-Service Coordination**: Synchronous REST calls secure vehicle holds on `vehicle-product`; if deposit payment fails, the hold is released immediately.
- **Irreversible Steps**: Once a digital purchase contract is signed by both buyer and dealer, it constitutes a legally binding document. Once a vehicle is physically handed over, the transaction cannot be rolled back via an automated Saga compensation.

---

## B. Internal Module Decomposition

### 1. Sales Pipeline Module
- **Responsibility**: Tracks customer interest, test drive bookings, and salesperson assignments.
- **Owned Data**: `sales_deal`, `deal_activity_log`.

### 2. Vehicle Sales Saga Orchestrator Module
- **Responsibility**: Manages the stateful sales saga: requesting VIN hold from `vehicle-product` ➔ charging holding deposit via Stripe ➔ confirming hold ➔ managing contract progression. Handles deposit compensation and hold release.
- **Owned Data**: `saga_instance`, `saga_step_history`.

### 3. Deposit & Payment Module
- **Responsibility**: Handles customer deposit processing via Stripe, deposit refund approvals, and receipt generation.
- **Owned Data**: `vehicle_deposit`, `deposit_refund_record`.

### 4. Sales Contract & Document Module
- **Responsibility**: Generates legally compliant purchase contracts, tracks digital signatures, and records buyer disclosures.
- **Owned Data**: `sales_contract`, `contract_disclosure`, `buyer_signature`.

### 5. Handover & Delivery Module
- **Responsibility**: Manages final vehicle handover, mileage verification at delivery, customer title documentation, and handover sign-off.
- **Owned Data**: `vehicle_handover`.

---

## C. Comprehensive Activity Catalog

| Activity ID | Activity Name | Module | Initiator / Trigger | Transaction Boundary | Consistency | Concurrency Control | Authorization | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-SAL-001** | Create Vehicle Sales Deal / Lead | Pipeline | Customer Inquiry / Web | Local Service TX | Strong | Client Session | Public | MVP | Proposed |
| **ACT-SAL-002** | Submit Customer Vehicle Deposit ($500) | Deposit/Saga | Customer Clicks "Hold Car" | Local TX + Remote Hold + Stripe | Strong | Stripe Idempotency Key | `customer` | MVP | Proposed |
| **ACT-SAL-003** | Refund Vehicle Deposit | Deposit | Customer Cancels / Mgr | Local TX + Stripe Refund | Strong | Validates uncontracted deal | `store_manager` | MVP | Proposed |
| **ACT-SAL-004** | Draft Purchase Agreement & Fees | Contract | Sales Rep / Finance Mgr | Local Service TX | Strong | Optimistic `@Version` | `shop_worker` | MVP | Proposed |
| **ACT-SAL-005** | Sign Purchase Agreement Digitally | Contract | Customer | Local Service TX | Strong | Cryptographic signature token | `customer` | MVP | Proposed |
| **ACT-SAL-006** | Complete Vehicle Sale & Trigger Delivery | Handover | Finance Mgr | Local TX + Remote `mark-sold` | Strong | Validates full payment/financing | `store_manager` | MVP | Proposed |
| **ACT-SAL-007** | Record Final Handover & Odometer | Handover | Sales Rep at Delivery | Local Service TX | Strong | Customer delivery sign-off | `shop_worker` | MVP | Proposed |
