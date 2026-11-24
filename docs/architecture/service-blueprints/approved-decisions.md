# Authoritative Architecture Decisions and Numerical Policy Catalog

> **Status**: AUTHORITATIVE ARCHITECTURE DECISION REFERENCE (Phase 2F-B-R2)
> **Audited Documents Merged**: `06-architecture-decision-backlog.md`, `09-approved-business-rules.md`, `07-implementation-roadmap.md`

---

## 1. Owner-Approved Architecture Decisions (ADR-01 through ADR-18)

| Decision ID | Domain                | Approved Decision Summary                                                                                                                                                           |  Status  |
| :---------- | :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| **ADR-01**  | Vehicle Reference     | Generic YMMT reference data resides in `automotive-product`; specific VIN physical inventory units reside in `vehicle-product`.                                                     | APPROVED |
| **ADR-02**  | Pricing Authority     | `automotive-product` is the authoritative owner for base prices, calculation rules, and store-specific price overrides. `store-management` owns facility availability, not pricing. | APPROVED |
| **ADR-03**  | Inventory Concurrency | Conditional Atomic `UPDATE` with dual-ledger state (`quantity_on_hand`, `quantity_reserved`, `quantity_allocated`) in PostgreSQL. No in-memory Redis counters.                      | APPROVED |
| **ADR-04**  | Distributed Sagas     | Stateful Saga Orchestrator in `automotive-operations` with durable PostgreSQL step logging and idempotency keys. APISIX is gateway only.                                            | APPROVED |
| **ADR-05**  | Service Boundaries    | Standalone microservice architecture across strictly 8 services. Zero 9th business service.                                                                                         | APPROVED |
| **ADR-06**  | Outbox Relays         | Transactional Outbox pattern polling PostgreSQL outbox tables every 500ms using `SKIP LOCKED` to relay events to RabbitMQ.                                                          | APPROVED |
| **ADR-07**  | Read Projections      | Read-only local projections permitted for UI display (e.g., product titles in carts); never used to authorize stock, payments, or contracts.                                        | APPROVED |
| **ADR-08**  | Shopping Cart         | Redis String/JSON with optimistic versioning (`version` counter) is primary active cart store. Orders and sagas persist in PostgreSQL.                                              | APPROVED |
| **ADR-09**  | Cart Invalidation     | Multi-tiered batched revalidation on window focus + mandatory pre-checkout validation gate in `automotive-operations`.                                                              | APPROVED |
| **ADR-10**  | Services Modeling     | Unified sellable-item identity. Services link to `service_definition` (duration, equipment bay requirements) and do not track physical stock.                                       | APPROVED |
| **ADR-11**  | Multi-Store Carts     | Carts spanning multiple stores are partitioned at checkout into separate store-specific orders, each requiring explicit customer authorization.                                     | APPROVED |
| **ADR-12**  | Entitlements          | `SCHEDULE_LATER` is modeled as an unscheduled service entitlement on `order_item`, redeemed directly via `appointment`. No voucher subsystem.                                       | APPROVED |
| **ADR-13**  | Bay Scheduling        | System-selected compatible bay with PostgreSQL GiST Range Exclusion (`EXCLUDE USING GIST (bay_id WITH =, booked_period WITH &&)`) prevents double-booking.                          | APPROVED |
| **ADR-14**  | Work Orders           | Single `work_order` ticket per service visit with checklist tasks, inspection logs, and versioned supplemental repair quotes.                                                       | APPROVED |
| **ADR-15**  | Quote Approvals       | Supplemental repairs require explicit customer authorization on versioned quote revisions before technician work commences.                                                         | APPROVED |
| **ADR-16**  | Vehicle Sales         | `vehicle-sales` owns an independent stateful sales saga and digital purchase contracting workflow, decoupled from tire e-commerce.                                                  | APPROVED |
| **ADR-17**  | Database Isolation    | Independent PostgreSQL schemas per microservice with automated Flyway migrations. No cross-database queries or shared tables.                                                       | APPROVED |
| **ADR-18**  | Connection Pools      | HikariCP pool budgeting (10–20 connections per service instance) to prevent PostgreSQL connection saturation under peak load.                                                       | APPROVED |

---

## 2. Classification of Numerical Policies & Operational Parameters

To prevent architectural ambiguity, every numerical threshold in the platform is explicitly classified:

| Parameter Name                           | Service Owner           |     Current Value      | Classification  | Operational Notes                                                                                       |
| :--------------------------------------- | :---------------------- | :--------------------: | :-------------: | :------------------------------------------------------------------------------------------------------ |
| **Stock Reservation Hold Duration**      | `automotive-product`    |       15 minutes       | **OPEN-POLICY** | Default checkout window before `ReservationJanitorJob` frees unconfirmed stock.                         |
| **Bay Reservation Hold Duration**        | `store-management`      |       15 minutes       | **OPEN-POLICY** | Synchronized with stock hold window.                                                                    |
| **VIN Sales Holding Deposit Duration**   | `vehicle-product`       |        72 hours        | **OPEN-POLICY** | Deposit hold window before VIN is automatically returned to public listing.                             |
| **Vehicle Holding Deposit Amount**       | `vehicle-sales`         |      $500.00 USD       | **OPEN-POLICY** | Standard refundable holding deposit subject to dealership finance policy.                               |
| **Active Cart Inactivity TTL (Auth)**    | `automotive-operations` |         7 days         | **OPEN-POLICY** | TTL refreshed on every cart mutation for authenticated accounts.                                        |
| **Active Cart Inactivity TTL (Guest)**   | `automotive-operations` |        48 hours        | **OPEN-POLICY** | TTL for anonymous guest sessions.                                                                       |
| **Redis Persistence Configuration**      | `automotive-operations` | `appendfsync everysec` | **OPEN-POLICY** | Trade-off: prospective $\le 1\text{s}$ cart data loss during host power failure vs write latency.       |
| **Outbox Relay Polling Interval**        | All Services            |         500 ms         | **OPEN-POLICY** | Balance between event delivery freshness and database CPU polling overhead.                             |
| **Saga Crash Recovery Timeout**          | `automotive-operations` |       5 minutes        | **OPEN-POLICY** | Grace period before `CheckoutSagaRecoveryJob` evaluates stuck saga instances.                           |
| **Notification Max Retry Attempts**      | `notification`          |       3 attempts       | **OPEN-POLICY** | Exponential backoff (1s, 5s, 30s) before routing to dead-letter queue.                                  |
| **Target Scale Baseline**                | All Services            |      15–50 stores      |   **TARGET**    | Planning baseline: 10–25 bays/store, 100k+ tire/part SKUs.                                              |
| **Service Non-Negative Stock Invariant** | `automotive-product`    |        $\ge 0$         |  **APPROVED**   | Absolute mathematical constraint: ATP $= \text{on\_hand} - (\text{reserved} + \text{allocated}) \ge 0$. |
| **Zero Double-Booking Invariant**        | `store-management`      |         Strict         |  **APPROVED**  | PostgreSQL GiST range exclusion constraint at database engine level.                                    |
