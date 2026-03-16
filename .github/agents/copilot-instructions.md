# CommunityManagement-Sample-Spec-Kit Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-16

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
- 007-simple-ui-pages: Added TypeScript 5.9 / React 19 / Next.js 16 + Next.js App Router, React 19, Tailwind CSS v4 (to be installed), next-auth
- 007-mock-auth: Added TypeScript 5.x (strict mode) + Next.js 14+ (App Router), next-auth / @auth/core with Microsoft Entra External ID, Vitest (tests), PGlite (test DB)
- 006-code-review-fixes: Added TypeScript 5.x (strict mode) + Next.js 15 (App Router), Zod (validation), next-auth / @auth/core (session auth), @azure/storage-blob (photos)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
