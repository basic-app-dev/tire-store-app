# [HISTORICAL ARCHIVE] Legacy Physical Data Specification: `appointment` (`appointment_db`)

> **ARCHIVE NOTICE (`P5-DEC-01`, 2026-11-27)**: This document is a **retired historical data specification** moved out of `data-definitions/services/` during Part 5 consolidation.
> **Authoritative Active Data Specification**: [`../data-definitions/services/store-management.md`](../data-definitions/services/store-management.md) (`store_management_db` / `store_management` schema).
> **Authoritative Active Service Specification**: [`../services/store-management.md`](../services/store-management.md).

---

## Legacy Reference Summary (Pre-Consolidation)

- Standalone `appointment_db` / `appointment` schema (Port `8097`) is retired from the target 7-service architecture.
- `service_appointments`, `appointment_services`, `appointment_reschedule_logs`, and the deferred Part 7 `redemption_attempt` table (`APT-01`–`APT-10`) are owned by **`store_management_db` / `store_management`**.
- Do not create a separate `appointment_db` database or `appointment_migrator`/`appointment_app` roles in target deployments (`P5-DEC-11`).
