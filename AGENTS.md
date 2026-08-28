# AGENTS.md — ARCHIC DESIGN SYSTEM v2

This repository uses **ARCHIC Design System v2** for every user-facing UI change.

## Required reading order

Before changing UI, copy, layout, motion, responsive behavior or client-facing flows:

1. Read `design-system/core.md`.
2. Read `PROJECT-DESIGN.md`.
3. Read `design-system/modules/copy.md`.
4. Read `design-system/modules/mobile.md`.
5. Read `design-system/modules/qa.md`.
6. Read `design-system/modules/local-business.md`.
7. Read `design-system/modules/commerce.md` when touching vehicles/catalogue/enquiry surfaces.
8. Read `design-system/modules/motion.md` whenever motion is more than trivial state feedback.

## Execution contract

- Do not start UI work without a current **Design Thesis** and **Business-Native Primitive**.
- Project-specific identity in `PROJECT-DESIGN.md` wins over generic visual defaults.
- Truthfulness, accessibility, functionality and QA hard gates are never optional.
- Every page must contain at least three deliberate decisions that come from this business.
- Run the **Reskin Test** before delivery. If the same interface could sell an unrelated business after only changing logo, copy, colour and images, redesign it.
- Mobile is an independently composed mode, not desktop stacked vertically.
- Motion must have a job. Never animate every section by default.
- Do not invent testimonials, metrics, certifications, capacity, availability, customers, awards or live status.
- Do not use imagery merely to fill space. Prefer real vehicles, real operation and real local evidence.
- Do not call work done/client-ready/production-ready until the rendered Delivery Gate passes with **0 Hard Gate failures**.

## Required final evidence

For any non-trivial UI change, update or produce an `ARCHIC DELIVERY REPORT` with:

- build/deployment inspected
- desktop viewport inspected
- mobile widths inspected
- critical routes tested
- Hard Gate failures
- Reskin Test result
- score
- known limitations
- fixes made during final QA
