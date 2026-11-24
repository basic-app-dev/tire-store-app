# Microservice Architecture Specification: `identity-access`

> **Service Identity**: `identity-access` (Port 8096)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-B-R2)
> **Primary Authority**: User Profiles, Keycloak OIDC Sync, Store-Scoped Staff RBAC & Customer Virtual Garage
> **Storage**: PostgreSQL (profiles, store role assignments, customer garage vehicles)
> **Consolidated Modules**: 2 Substantive Modules
> **Total Activities Owned**: 7 Activities (`ACT-IDN-001` through `ACT-IDN-007`)
> **Total Unique HTTP Endpoints**: 7 Endpoints

---

## 1. Domain Boundary & Module Architecture

`identity-access` handles user context, customer vehicle garage persistence, and store-level authorization enforcement.

```
identity-access (Port 8096)
├── iam/          # MODULE 1: Identity & Access Management (IAM) Module (4 activities: ACT-IDN-001..ACT-IDN-004)
└── garage/       # MODULE 2: Customer Garage Module (3 activities: ACT-IDN-005..ACT-IDN-007)
```

---

## 2. Activity Catalog & API Contracts by Module

### 2.1 Module 1: Identity & Access Management (IAM) Module
- **ACT-IDN-001**: Synchronize Keycloak User Profile (`POST /api/v1/identity/sync`) | Zero password storage; OIDC subject sync | SLO: < 45 ms.
- **ACT-IDN-002**: Assign Store-Scoped Staff Role (`POST /api/v1/identity/admin/users/{id}/roles`) | Binds user to store_id | SLO: < 60 ms.
- **ACT-IDN-003**: Revoke Store-Scoped Staff Role (`DELETE /api/v1/identity/admin/users/{id}/roles/{roleId}`) | SLO: < 50 ms.
- **ACT-IDN-004**: Validate User Store-Level Authorization (`POST /api/v1/identity/validate-access`) | Token scope evaluation | SLO: < 20 ms.

---

### 2.2 Module 2: Customer Garage Module
- **ACT-IDN-005**: Save Customer Vehicle to Virtual Garage (`POST /api/v1/identity/garage/vehicles`) | YMMT, license plate, VIN | SLO: < 40 ms.
- **ACT-IDN-006**: Query Customer Garage Vehicles (`GET /api/v1/identity/garage/vehicles`) | Fast customer garage load | SLO: < 25 ms.
- **ACT-IDN-007**: Remove Vehicle from Garage (`DELETE /api/v1/identity/garage/vehicles/{id}`) | Soft delete | SLO: < 30 ms.
