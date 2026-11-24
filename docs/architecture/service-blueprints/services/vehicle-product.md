# Microservice Architecture Specification: `vehicle-product`

> **Service Identity**: `vehicle-product` (Port 8094)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-B-R2)
> **Primary Authority**: Physical VIN Inventory, 150-Point Inspections, Sales Holds, Reconditioning & Public Vehicle Listings
> **Storage**: PostgreSQL (vehicles, inspections, hold leases, photo galleries)
> **Consolidated Modules**: 2 Substantive Modules
> **Total Activities Owned**: 10 Activities (`ACT-VEH-001` through `ACT-VEH-010`)
> **Total Unique HTTP Endpoints**: 9 Endpoints (9 HTTP routes + 1 background daemon)

---

## 1. Domain Boundary & Module Architecture

`vehicle-product` is the authoritative custodian of physical used vehicles, identified strictly by 17-character VIN.

```
vehicle-product (Port 8094)
├── inventory/     # MODULE 1: Vehicle Inventory & Condition Module (7 activities: ACT-VEH-001, 002, 006, 007, 008, 009, 010)
└── merchandising/ # MODULE 2: Vehicle Merchandising & Listing Module (3 activities: ACT-VEH-003, 004, 005)
```

---

## 2. Activity Catalog & API Contracts by Module

### 2.1 Module 1: Vehicle Inventory & Condition Module
- **ACT-VEH-001**: Ingest Used Vehicle Record by 17-Char VIN (`POST /api/v1/vehicles/inventory`) | Unique index on `vin` | SLO: < 80 ms.
- **ACT-VEH-002**: Place Exclusive Sales Hold on VIN (`POST /api/v1/vehicles/inventory/{vin}/hold`) | 72-hour deposit hold | SLO: < 60 ms.
- **ACT-VEH-006**: Record 150-Point Mechanical Inspection (`POST /api/v1/vehicles/inventory/{vin}/inspection`) | JSONB inspection checklist | SLO: < 90 ms.
- **ACT-VEH-007**: Update Vehicle Reconditioning Status (`PATCH /api/v1/vehicles/inventory/{vin}/reconditioning`) | Detail / mechanical stages | SLO: < 50 ms.
- **ACT-VEH-008**: Update Vehicle Physical Lot Location (`PATCH /api/v1/vehicles/inventory/{vin}/location`) | Store branch & lot space | SLO: < 40 ms.
- **ACT-VEH-009**: Mark Vehicle Permanently SOLD (`POST /api/v1/vehicles/inventory/{vin}/sold`) | Terminal state | SLO: < 50 ms.
- **ACT-VEH-010**: Release Expired Vehicle Hold (`NO HTTP ENDPOINT`) | `VinHoldJanitorJob` running every 5m | SLO: 5m delay.

---

### 2.2 Module 2: Vehicle Merchandising & Listing Module
- **ACT-VEH-003**: Search Public Vehicle Listings (`GET /api/v1/vehicles/inventory/listings`) | Indexed multi-attribute search | SLO: < 40 ms.
- **ACT-VEH-004**: Get Comprehensive Vehicle Listing Details (`GET /api/v1/vehicles/inventory/listings/{vin}`) | Public specs & Carfax | SLO: < 30 ms.
- **ACT-VEH-005**: Upload Vehicle Photo Gallery & Spin Video (`POST /api/v1/vehicles/inventory/listings/{vin}/photos`) | S3/MinIO upload | SLO: < 300 ms.
