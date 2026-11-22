# @builder — Full-Stack Developer

[← Back to Agent Overview](README.md)

- **Role**: Core Full-Stack Developer
- **Assigned Model**: Flash 3.8
- **Assigned Skills**: `superpowers`, `ponytail`, `refactor-wizard`, `stripe-payments`, `expo-native`
- **Native Definition**: [`.agents/agents/builder.md`](../../.agents/agents/builder.md)

---

## 1. Domain & Scope

The `@builder` agent executes the full-stack implementation across Spring Boot backend services, web and mobile storefronts, payments, and client abstractions.

### Key Focus Areas

1. **Spring Boot Backend Services (`backend/services/*`)**:
   - Java 25 LTS and Spring Boot 4.2.x REST controllers, domain models, and service logic.
   - Spring Data JPA, JdbcClient, and Flyway migration execution across the eight services.
2. **Next.js Web Storefront (`apps/web`)**:
   - Next.js 14+ App Router structure and layouts.
   - Incremental Static Regeneration (ISR) configuration on catalog product pages.
   - Admin management dashboard views.
3. **Expo Cross-Platform Mobile App (`apps/mobile`)**:
   - Expo Router screens for iOS and Android.
   - Hardware integration: technician camera barcode scanner, geolocation, and push alerts.
4. **Payments & Saga Orchestration**:
   - Payment provider integrations (Stripe Elements on Web, mobile payment SDKs).
   - Distributed Saga integration in `automotive-operations` for order checkout, bay booking, and payment confirmation.

---

## 2. Typical Prompts & Tasks (Illustrative)

- _"@builder initialize the REST controller and service layer for the automotive-product service."_
- _"@builder build the tire search filter sidebar in apps/web with Next.js ISR."_
- _"@builder implement the technician barcode scanner screen in apps/mobile using Expo Camera."_
- _"@builder implement the checkout Saga participant in automotive-operations for order and payment handling."_
