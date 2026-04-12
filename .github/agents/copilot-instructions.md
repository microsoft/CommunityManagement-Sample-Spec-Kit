# CommunityManagement-Sample-Spec-Kit Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-09

## Active Technologies
- TypeScript 5.x (strict mode) + Next.js 14+ (App Router — API routes + React frontend), Zod (validation), Stripe SDK (Connect Standard — from 004), next-auth / @auth/core with Microsoft Entra External ID (from 004), ical-generator (.ics files) (001-event-discovery-rsvp)
- PostgreSQL (production), PGlite (test isolation) (001-event-discovery-rsvp)
- TypeScript 5.x (strict mode) + Next.js 14+ (App Router — API routes + React frontend), Zod (validation), next-auth / @auth/core with Microsoft Entra External ID (from 004) (002-community-social)
- TypeScript 5.x (strict mode) + Next.js 14+ (App Router — API routes + React frontend), Zod (validation), Stripe SDK (Connect Standard — from 004), next-auth / @auth/core with Microsoft Entra External ID (from 004), ical-generator (from 001), `rrule` (RFC 5545 recurrence expansion — NEW for 003) (003-recurring-multiday)
- TypeScript 5.x (strict mode) + Next.js 14+ (App Router — API routes + React frontend), Zod (validation), @azure/storage-blob (proof document uploads), next-auth / @auth/core with Microsoft Entra External ID (005-teacher-profiles-reviews)
- PostgreSQL (production), PGlite (test isolation), Azure Blob Storage (proof documents) (005-teacher-profiles-reviews)
- TypeScript 5.x (strict mode) + Next.js 15 (App Router), Zod (validation), next-auth / @auth/core (session auth), @azure/storage-blob (photos) (006-code-review-fixes)
- PostgreSQL (production), PGlite (test isolation via `createTestDb()`) (006-code-review-fixes)
- TypeScript 5.x (strict mode) + Next.js 14+ (App Router), next-auth / @auth/core with Microsoft Entra External ID, Vitest (tests), PGlite (test DB) (007-mock-auth)
- PostgreSQL (production), PGlite (test isolation). No new tables — uses existing `users` and `permission_grants` tables. (007-mock-auth)
- TypeScript 5.9 / React 19 / Next.js 16 + Next.js App Router, React 19, Tailwind CSS v4 (to be installed), next-auth (007-simple-ui-pages)
- N/A (all APIs already exist; no new DB tables) (007-simple-ui-pages)
- TypeScript 5.9 (strict mode) + Next.js 16 (App Router, React 19), Zod 4 (validation), PGlite (test isolation) (009-user-directory)
- PostgreSQL (production), PGlite (in-memory test isolation via `createTestDb()`) (009-user-directory)
- TypeScript 5.x (strict mode), React 19, Next.js 16 (App Router) + Next.js 16 (App Router), React 19, Leaflet + react-leaflet (lazy-loaded), Leaflet.markercluster, date-fns (calendar logic), @acroyoga/shared (types), @acroyoga/tokens (design tokens) (010-events-explorer)
- N/A — reads from existing `/api/events` and `/api/cities` endpoints (010-events-explorer)
- TypeScript 5.x / Node.js 22 + Next.js 16, `@azure/identity` ^4.6.0, `@azure/storage-blob` ^12.31.0, `pg` ^8.20.0 (012-managed-identity-deploy)
- Azure PostgreSQL Flexible Server (Entra token auth via MI), Azure Blob Storage (DefaultAzureCredential) (012-managed-identity-deploy)
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (019-performance-optimization)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (019-performance-optimization)
- Node.js 24 (application), Bicep (infrastructure), YAML (GitHub Actions workflows) + GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v2`, `azure/container-apps-deploy-action@v2`), Azure CLI (copilot/create-acute-publishing-gh-actions)
- PostgreSQL Flexible Server (nightly instance, Standard_B1ms), Azure Blob Storage (nightly instance), Azure Key Vault (nightly instance) (copilot/create-acute-publishing-gh-actions)

- TypeScript 5.x (strict mode) + Next.js 14+ (App Router — API routes + React frontend), Zod (validation), Stripe SDK (Connect Standard), next-auth / @auth/core with Microsoft Entra External ID (004-permissions-creator-accounts)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.x (strict mode): Follow standard conventions

## Recent Changes
- copilot/create-acute-publishing-gh-actions: Added Node.js 24 (application), Bicep (infrastructure), YAML (GitHub Actions workflows) + GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v2`, `azure/container-apps-deploy-action@v2`), Azure CLI
- copilot/add-web-and-mobile-urls: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 017-seo-social-sharing: TypeScript 5.9 strict + Next.js 16 App Router built-ins only — `generateMetadata()`, `next/og` `ImageResponse`, `sitemap.ts`, `robots.ts` conventions; no new npm packages; `SharePanel` lazy-loaded via `next/dynamic`
- 019-performance-optimization: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
