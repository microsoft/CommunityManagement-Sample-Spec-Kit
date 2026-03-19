# Data Model: 007 — Simple UI Pages

**Feature Branch**: `007-simple-ui-pages`  
**Date**: 2026-03-16

## Overview

This feature introduces **no new data entities**. All pages consume existing API routes that return already-defined TypeScript types. This document catalogs the existing types consumed by each page for reference during implementation.

## Existing Types Consumed

### Events (from `src/types/events.ts`)

| Type | Used By | Fields Referenced |
|------|---------|-------------------|
| `EventSummary` | Landing page, Events list | `id`, `title`, `startDatetime`, `cityName`, `venueName`, `category`, `skillLevel`, `capacity`, `confirmedCount`, `cost`, `posterImageUrl` |
| `EventDetail` | Event detail page | All of `EventSummary` + `description`, `endDatetime`, `venue`, `roleBreakdown`, `status`, `ticketTypes`, `teachers` |

### Teachers (from `src/types/teachers.ts`)

| Type | Used By | Fields Referenced |
|------|---------|-------------------|
| `TeacherSummary` | Teacher directory (inline type) | `id`, `display_name`, `bio`, `specialties`, `badge_status`, `aggregate_rating`, `review_count`, `city` |
| Teacher detail | Teacher profile page | Profile fields + reviews + upcoming events |

### Bookings (inline type in `bookings/page.tsx`)

| Type | Used By | Fields Referenced |
|------|---------|-------------------|
| `Booking` | Bookings page | `id`, `ticket_type_name`, `group_name`, `pricing_tier`, `amount_paid`, `currency`, `credits_applied`, `payment_status`, `created_at` |

### Profile (inline type in `profile/page.tsx`)

| Type | Used By | Fields Referenced |
|------|---------|-------------------|
| Profile form state | Profile page | `displayName`, `bio`, `defaultRole`, `avatarUrl`, `homeCityId`, `socialLinks` |

### Auth Session (from `next-auth`)

| Type | Used By | Fields Referenced |
|------|---------|-------------------|
| `Session` | NavHeader | `user.name`, `user.email`, `user.image` |

## New Types

**None.** No new TypeScript types or interfaces are introduced by this feature.

## State Transitions

**None.** This feature is read-only presentation. All state mutations go through existing API routes unchanged.

## Validation Rules

**None new.** Existing API-level Zod validation continues to apply to all form submissions (profile edit, settings changes).
