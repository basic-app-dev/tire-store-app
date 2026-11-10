# @builder — Full-Stack Developer

[← Back to Agent Overview](README.md)

- **Role**: Core Full-Stack Developer
- **Assigned Model**: Flash 3.8
- **Assigned Skills**: `superpowers`, `ponytail`, `refactor-wizard`, `stripe-payments`, `expo-native`
- **Native Definition**: [`.agents/agents/builder.md`](../../.agents/agents/builder.md)

---

## 1. Domain & Scope

The `@builder` agent executes the full-stack implementation across web and mobile storefronts, payments, and client abstractions.

### Key Focus Areas

1. **Next.js Web Storefront (`apps/web`)**:
   - Next.js 14+ App Router structure and layouts.
   - Incremental Static Regeneration (ISR) configuration on catalog product pages.
   - Admin management dashboard views for store managers.
2. **Expo Cross-Platform Mobile App (`apps/mobile`)**:
   - Expo Router screens for iOS and Android.
   - Hardware integration: technician camera barcode scanner, geolocation, and push alerts.
3. **Stripe Payments**:
   - Stripe Elements integration on Web.
   - Native Apple Pay & Google Pay via `@stripe/stripe-react-native` on mobile.
4. **Shared API Client (`packages/api-client`)**:
   - React Query hooks for queries and optimistic mutations.
   - Supabase client integration conforming to `@tire-store/types`.

---

## 2. Typical Prompts & Tasks

- _"@builder build the tire search filter sidebar in apps/web with Next.js ISR."_
- _"@builder implement the technician barcode scanner screen in apps/mobile using Expo Camera."_
- _"@builder integrate Stripe payment intent handling and webhook confirmation."_
