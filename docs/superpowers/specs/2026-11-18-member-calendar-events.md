# Member Calendar Events

## Intent

Give signed-in ABG members a private calendar where they can immediately publish events for other signed-in members. These events must never appear in the public events API, public events page, or public iCalendar feed.

## Goals

- Any authenticated ABG user can create a member event.
- Only authenticated users can read the member-event API and member calendar page.
- Each member event can be opened for its details and added to the viewer's Google Calendar.
- The existing public calendar remains public-only and is not changed to include member events.

## Constraints

- No Google OAuth scope or Google Calendar API write access is needed: Google Calendar template URLs let the member choose the destination calendar without giving the site access to it.
- Do not expose a subscribe-to-all `.ics` feed for member events: Google fetches subscribed feeds without the member's site session, which would make a members-only feed public.
- Any signed-in user (including the normal `USER` role) may create an event; anonymous requests receive 401.

## Approaches

1. Reuse the public `Event` collection with a visibility field. This risks a missed filter leaking a member event onto the public calendar.
2. Use a distinct `MemberEvent` collection and member-only API/page. Selected: it makes the privacy boundary explicit and avoids changing the existing public event flows.
3. Connect members' Google accounts and write events through the Calendar API. Rejected: it requires a broader OAuth consent flow and stores calendar access unnecessarily for an "add to my calendar" action.

## Design

- `/member-calendar` is a client page that redirects anonymous visitors to sign-in, loads `/api/member-events`, and shows an event-creation form plus `EventCalendar`.
- `GET /api/member-events` returns events only after a valid session. `POST /api/member-events` validates title, start/end, and optional details before inserting a `MemberEvent` record with the session user as creator.
- `EventCalendar` supplies the event-details dialog and a Google Calendar template link. Its label will say "Add to my Google Calendar."
- The signed-in navigation links to `/member-calendar`; the public home and `/events` pages continue to use only the public `Event` collection.
