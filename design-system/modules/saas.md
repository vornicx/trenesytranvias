# ARCHIC DOMAIN — SAAS / OPERATIONS UI

## Goal

Make internal product UI reflect the real workflow, states and decisions of the business rather than a generic dashboard aesthetic.

## Native primitives

- workflow
- product / opportunity state
- input → qualification → action → outcome
- real data
- filtering and prioritisation
- collaboration / ownership
- history and audit trail
- export / reporting when useful

## Avoid

- generic SaaS glow or purple gradients
- fake macOS/browser windows
- fake live/activity badges
- icon-tile feature grids
- decorative KPI cards with no decision value
- universal rounded cards and pills
- motion that slows scanning
- hidden state behind hover
- invented operational data
- styling every state as equally important

## Prefer

- real workflow states
- compact scanning
- explicit next actions
- clear ownership and follow-up dates
- visible filters and search
- meaningful status encoding
- tables/rows when comparison is the task
- pipeline cards only because each opportunity is a discrete actionable object
- keyboard/focus support
- mobile recomposition for urgent actions rather than shrinking desktop tables

## Studio-specific primitive

`SOLICITUD → CUALIFICACIÓN → SEGUIMIENTO → PROPUESTA → CIERRE`

The interface should make movement through that commercial sequence obvious. Yellow signal is reserved for the next useful action, active state or operational attention; it is not decoration.
