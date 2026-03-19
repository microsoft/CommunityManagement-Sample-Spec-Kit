# Implementation Plan: User Directory

**Spec**: 009 | **Date**: 2026-03-19

---

## Architecture Summary

| Layer | File(s) | Notes |
|-------|---------|-------|
| DB migration | `src/db/migrations/007_user_directory.sql` | Adds `directory_visible` column |
| Shared types | `packages/shared/src/types/directory.ts` | `DirectoryEntry`, search params/response |
| Shared schemas | `packages/shared/src/schemas/directory.ts` | Zod validation for API params |
| Service | `src/lib/directory/service.ts` | `searchDirectory`, `setDirectoryVisibility` |
| Validation | `src/lib/validation/directory-schemas.ts` | Re-exports shared schemas |
| API – browse | `src/app/api/directory/route.ts` | `GET /api/directory` |
| API – visibility | `src/app/api/directory/visibility/route.ts` | `PATCH /api/directory/visibility` |
| UI page | `src/app/directory/page.tsx` | Client component with search/filter |
| Tests | `tests/integration/community/directory.test.ts` | Integration tests (PGlite) |

---

## Design Decisions

1. **Single query per page** — JOINs + `json_agg()` avoids N+1. No separate social_links fetch.
2. **Cursor-based pagination** — composite `(display_name, user_id)` cursor for stable paging.
3. **Privacy-first** — `directory_visible` defaults to `false`; users must opt in.
4. **Block enforcement** — `NOT EXISTS` subquery removes blocked pairs from results.
5. **Relationship detection** — two LEFT JOINs on `follows` table (viewer→member, member→viewer).
6. **Completeness score** — computed inline in the service, no DB column.
7. **Auth required** — all directory endpoints need a session (no anonymous access).

---

## Phase Breakdown

### Phase 1: Setup (T001–T006)
- DB migration + indexes
- Shared types + schemas
- Spec artifacts

### Phase 2: Service Layer (T007–T009)
- `searchDirectory()` with all filter/cursor logic
- `setDirectoryVisibility()` 

### Phase 3: US1 Browse (T010–T017)
- `GET /api/directory` route
- Directory page UI

### Phase 4: US2 Search & Filter (T018–T027)
- Text search, city, role, teacher filter params added to service + API

### Phase 5: US3 Visibility Toggle (T028–T035)
- `PATCH /api/directory/visibility` route
- Settings UI toggle

### Phase 6: US4 Relationship Status (T036–T041)
- Relationship badges on directory cards

### Phase 7: US5 Social Icons (T042–T045)
- Social link icons filtered by relationship level

### Phase 8: US6 Relationship Filter (T046–T049)
- `relationship` filter param

### Phase 9: US7 Completeness Indicator (T050–T053)
- Completeness score in service response + card indicator

### Phase 10: US8 Proximity Sort (T054–T057)
- Proximity sort by home city hierarchy

### Phase 11: Polish (T058–T059)
- Empty states, loading skeletons, a11y pass
