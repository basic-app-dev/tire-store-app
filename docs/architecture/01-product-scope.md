# Product Scope

## Vision
A web, Android and iOS automotive platform serving **one automotive company with multiple physical branches**. Its four major product capabilities are tire/parts retail, repair shop operations, inventory/store management, and used-car listings/sales. Prioritize correctness, secure business operations, maintainability and a useful customer/employee experience.

## User groups and capabilities
- **Customers:** browse tires/parts by specification and vehicle fitment; buy products; choose a branch; book service; track orders; browse used vehicles; request test drives; manage vehicles and profile; receive notifications.
- **Technicians/employees:** view/advance authorized work orders; record labor, parts and inspections; attach photos; view inventory/appointments.
- **Store managers:** manage branch resources, employees, appointments, inventory movements, service activity and branch reports.
- **Vehicle sales staff:** manage vehicle listing availability, leads, test drives and sales lifecycle.
- **Company administrators:** manage company-wide policies, branches, access and reporting.

These are capabilities, not a final screen inventory or permission matrix.

## Business hierarchy
One organization → multiple branches/stores → store-specific resources, employees, appointments, inventory and transactions. Use stable `store_id` identifiers wherever location ownership matters. Roles/permissions may be scoped to one or multiple stores. Cross-store transfers must be explicit operations. Do **not** implement independent-tenant provisioning, tenant billing, SaaS subscriptions or separate per-customer deployments.

## Essential end-to-end scenarios
1. Tire search → branch stock check → order → inventory reservation → appointment/resource hold → payment coordination → work order → notification.
2. Repair intake → work order → parts/labor usage → invoicing/payment → completion notice.
3. Used-car listing → availability inquiry → test drive → vehicle sale/deposit → vehicle state update.
4. Stock transfer between branches with traceable movement and updated availability.

Required failure handling includes conflicting reservations, payment errors, request retries, duplicate messages, expirations and partial workflow failures. Financial/legal and vehicle-title processes require domain validation before implementation.

## Platform surfaces
- **Web:** public storefront, customer self-service, employee and manager dashboards.
- **Mobile:** Android/iOS customer and staff flows; scanning, cameras, notifications, and potentially offline work.
- **Hardware:** unknown; do not assume OBD-II, printers, sensors or vendor SDK support until researched and prototyped.
