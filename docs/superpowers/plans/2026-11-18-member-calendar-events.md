# Member Calendar Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow signed-in members to publish and view private member-calendar events, with per-event Google Calendar additions.

**Architecture:** Keep member events in a distinct `MemberEvent` collection behind a session-gated API. Render them only in a protected member-calendar page that reuses the existing `EventCalendar` details dialog and Google template URL helper.

**Tech Stack:** Next.js App Router, NextAuth, MongoDB, React, TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-11-18-member-calendar-events.md`

## Global Constraints

- Any signed-in ABG user may create member events; anonymous requests return 401.
- Member events must not be returned by public event endpoints or feeds.
- Do not make a members-only all-events iCalendar subscription URL public.
- Per-event Google Calendar links must not request or persist Google Calendar write access.

## Review Focus

- Anonymous GET and POST requests must not reveal or create member events.
- A malformed or missing event time must be rejected rather than persisted.
- An end time at or before the start must be rejected.
- A long/whitespace-only title must not yield an unusable event.
- Public `/api/events` results must remain sourced from `Event`, never `MemberEvent`.

---

### Task 1: Private member-event API

**Files:**
- Create: `src/app/api/member-events/route.ts`
- Test: `src/app/api/member-events/route.test.ts`

**Interfaces:**
- Produces: `GET(): Promise<NextResponse>` and `POST(request: NextRequest): Promise<NextResponse>`.
- Produces: `MemberEvent` documents containing `id`, `title`, `eventDate`, `endDate`, optional `description`/`location`, and `createdBy` metadata.

- [ ] **Step 1: Write failing route tests**

Cover unauthenticated `GET`/`POST` (401), valid authenticated create (201), missing title/time (400), and an end time not after start (400).

- [ ] **Step 2: Run the route tests to verify failure**

Run: `npm test -- src/app/api/member-events/route.test.ts`
Expected: FAIL because the route is absent.

- [ ] **Step 3: Implement the session-gated `GET` and `POST` route**

Read the NextAuth session server-side, query/insert only `MemberEvent`, sanitize trimmed text fields, generate an ID, and return JSON with sensible status codes.

- [ ] **Step 4: Run route tests and TypeScript validation**

Run: `npx tsc --noEmit`
Expected: PASS.

### Task 2: Protected member calendar page

**Files:**
- Create: `src/app/member-calendar/page.tsx`
- Modify: `src/components/Navbar.tsx`
- Test: `src/app/member-calendar/page.test.tsx`

**Interfaces:**
- Consumes: `/api/member-events` GET/POST.
- Consumes: `EventCalendar` with `CalendarItem[]`.
- Produces: the member-only create-event and calendar UI at `/member-calendar`.

- [ ] **Step 1: Write failing page tests**

Cover sign-in redirect, form submission to `POST /api/member-events`, and rendering only returned member events.

- [ ] **Step 2: Run the page tests to verify failure**

Run: `npm test -- src/app/member-calendar/page.test.tsx`
Expected: FAIL because the page is absent.

- [ ] **Step 3: Implement the page and dashboard link**

Redirect anonymous users to sign-in, load private events after authentication, provide required title/start/end inputs with optional description/location, and prepend the created event after a successful response. Add a signed-in navigation link to `/member-calendar`.

- [ ] **Step 4: Verify manually and with TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS; a signed-in member can create an event and see it on `/member-calendar`, while `/events` does not show it.

### Task 3: Calendar copy and regression verification

**Files:**
- Modify: `src/components/EventCalendar.tsx`
- Test: `src/lib/calendar-links.test.ts`

**Interfaces:**
- Consumes: `googleCalendarUrl(item: CalendarItem): string`.
- Produces: an event-details button labeled `Add to my Google Calendar`.

- [ ] **Step 1: Write a failing Google template URL test**

Assert the generated URL includes the selected event title, start/end, location, and description.

- [ ] **Step 2: Run the test to verify failure or identify the existing coverage gap**

Run: `npm test -- src/lib/calendar-links.test.ts`

- [ ] **Step 3: Add the member-focused button copy without changing the URL behavior**

Use the client-safe template link; do not add OAuth or an authenticated iCalendar feed.

- [ ] **Step 4: Run final validation**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.
