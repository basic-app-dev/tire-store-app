# Identity & Access Service (`identity-access`) — Capability & Architecture Blueprint

> **Service Status**: Skeletons & Health Endpoint `[EXISTING]`; Business Logic & Flyway Migrations `[PLANNED]`  
> **Port**: `8096`  
> **Key Architectural Authority**: Approved Decision (Keycloak OIDC handles credentials; `identity-access` owns application profiles, store-scoped RBAC, and customer garage).

---

## A. Service Overview

### 1. Business Purpose & Scope
The `identity-access` microservice manages application-layer user profiles, store-scoped role assignments, customer digital garage vehicles, and identity synchronization with Keycloak. Authentication credentials, password hashing, multi-factor authentication (MFA), and session token signing are delegated exclusively to Keycloak. `identity-access` enriches the security context with business rules, retail store assignment policies (`shop_worker`, `store_manager`), and customer vehicle profiles.

### 2. Owned Domain Entities
- **Application User Profile**: First name, last name, email, mobile phone, marketing opt-ins, account creation timestamp, linked Keycloak subject UUID (`sub`).
- **Store-Scoped Role Assignment**: User authorization grant mapping an identity to a specific operational role (`customer`, `shop_worker`, `store_manager`, `super_admin`) scoped to a specific retail `store_id`.
- **Customer Garage Vehicle**: Persisted vehicle records saved by a customer (Year, Make, Model, Trim, VIN, current odometer reading, license plate).
- **Security Audit Record**: Immutable security log tracking role modifications, permission revocations, and administrative role assignments.

### 3. Owned Business Capabilities
- User profile registration and self-service maintenance.
- Store-scoped RBAC policy management (granting and revoking employee access to specific physical stores).
- Customer digital garage management for 1-click tire fitment lookup.
- Synchronization with Keycloak OIDC webhooks and event listeners.
- Zero credential storage (passwords, salts, and MFA secrets are **never** stored in application databases).

### 4. Primary Consumers & Authorized Actors
- **Consumers**:
  - `apps/web` & `apps/mobile`: Customer account settings, digital garage vehicle selector.
  - Next.js Admin Dashboard: Employee onboarding, store assignment management.
  - Spring Security Resource Servers: Downstream services validate JWT token claims generated from identity data.
- **Authorized Actors**:
  - `customer`: Manages own profile and garage vehicles.
  - `shop_worker`: Views assigned technician profile.
  - `store_manager`: Assigns shop worker roles for their assigned `store_id`.
  - `super_admin`: Assigns store managers, provisions new stores, conducts security audits.

### 5. Service Dependencies
- **Downstream Services Consumed**:
  - `store-management`: Validates that a physical `store_id` exists before granting employee roles.
- **External Dependencies**:
  - Keycloak OIDC Provider (Admin REST API & OIDC token endpoints).

### 6. Events Published & Consumed `[PLANNED via Outbox]`
- **Events Published**:
  - `identity.profile.updated` (v1)
  - `identity.role.assigned` (v1)
  - `identity.role.revoked` (v1)

### 7. Data Consistency & Invariants
- **Zero Local Password Storage**: The service database contains zero credential columns.
- **Store-Scoped Authorization Invariant**: Employee mutations (updating inventory, advancing work orders) must verify that the user's JWT `store_id` claim matches the target resource's `store_id`. Client-provided headers or query parameters are never trusted without backend validation.

---

## B. Internal Module Decomposition

### 1. User Profile Module
- **Responsibility**: Manages core user contact data, preferences, and account linking.
- **Owned Data**: `user_profile`.

### 2. Access Management (RBAC) Module
- **Responsibility**: Manages store-scoped roles, permission mappings, and administrative role grants.
- **Owned Data**: `role_assignment`, `security_audit_log`.

### 3. Customer Garage Module
- **Responsibility**: Manages customer saved vehicles for instant tire fitment matching.
- **Owned Data**: `customer_garage_vehicle`.

### 4. Identity Sync Module
- **Responsibility**: Reconciles Keycloak user registration events with local user profile records.

---

## C. Comprehensive Activity Catalog

| Activity ID | Activity Name | Module | Initiator / Trigger | Transaction Boundary | Consistency | Concurrency Control | Authorization | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-IDN-001** | Create User Profile | Profile | Keycloak OIDC Webhook | Local Service TX | Strong | Keycloak Subject UUID | Public / Keycloak | MVP | Proposed |
| **ACT-IDN-002** | Update User Contact Profile | Profile | Customer on Web / Mobile | Local Service TX | Strong | Optimistic `@Version` | `customer` | MVP | Proposed |
| **ACT-IDN-003** | Assign Store Role to Employee | Access | `store_manager` / Admin | Local Service TX + Outbox | Strong | Unique User-Store Role | `store_manager` | MVP | Proposed |
| **ACT-IDN-004** | Revoke Store Role | Access | `store_manager` / Admin | Local Service TX + Outbox | Strong | Status Precondition | `store_manager` | MVP | Proposed |
| **ACT-IDN-005** | Add Vehicle to Customer Garage | Garage | Customer on Web / Mobile | Local Service TX | Strong | Client Session Token | `customer` | MVP | Proposed |
| **ACT-IDN-006** | Remove Vehicle from Garage | Garage | Customer on Web / Mobile | Local Service TX | Strong | Primary Key Lookup | `customer` | MVP | Proposed |
| **ACT-IDN-007** | List Customer Garage Vehicles | Garage | Customer on Web / Mobile | Read-Only Local TX | Strong | Customer ID Index | `customer` | MVP | Proposed |
