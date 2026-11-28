# [HISTORICAL ARCHIVE] Legacy Microservice Specification: `appointment` (Port 8097)

> **ARCHIVE NOTICE (`P5-DEC-01`, 2026-11-27)**: This document is a **retired historical specification** moved out of `services/` during Part 5 consolidation.
> **Authoritative Active Specification**: [`../services/store-management.md`](../services/store-management.md) (Port `8098`, Module 3: Appointment Management, owning `ACT-APT-001`–`ACT-APT-010`).
> **Authoritative Active Data Specification**: [`../data-definitions/services/store-management.md`](../data-definitions/services/store-management.md).
> **Physical Source Directory**: `backend/services/appointment/` is preserved untouched until Phase 3 code consolidation (`P5-DEC-11`).

---

## Legacy Reference Summary (Pre-Consolidation)

- Standalone `appointment` (Port `8097`) previously owned `management/` (`ACT-APT-001`, `003`–`010`) and `scheduling/` (`ACT-APT-002`) and called `store-management` (:8098) over REST for bay holds.
- Under **`P5-DEC-01`**, all 10 activities (`ACT-APT-001`–`010`), the `SCHEDULE_LATER` entitlement-redemption protocol (`APT-01`–`APT-10`), and reminder/cancellation/reschedule contracts (`APT-11`–`APT-13`) are consolidated into **`store-management` (:8098)** using local PostgreSQL ACID transactions in `store_management_db`.
- Legacy customer-facing `ACT-APT-010` drafts that included `bay_id` in the request payload are **superseded**: customer-facing appointment APIs never require or expose internal `bay_id` or `bay_number` (`P5-DEC-05`).
