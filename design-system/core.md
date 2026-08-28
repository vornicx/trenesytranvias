# ARCHIC DESIGN SYSTEM v2 — CORE

> Executable standard. Project direction wins over defaults except accessibility, truthfulness, functionality and QA hard gates.

## Operating model

1. Research the business.
2. Write/read `PROJECT-DESIGN.md`.
3. Define a Design Thesis.
4. Define a Business-Native Primitive.
5. Load only relevant modules.
6. Define page/section intent before implementation.
7. Implement.
8. Run visual + functional QA.
9. Run the Delivery Gate.
10. Fix failures before completion.

## Mandatory Design Thesis

It must answer what business this is, who decides, what the site should make them feel, what the business already owns visually, what must be specific to it, what it must not resemble and what the dominant visual idea is.

If the thesis could fit three unrelated companies, rewrite it.

## Business-Native Primitive

Use at least one content/interaction/visual primitive that naturally belongs to the subject. It must shape layout and interaction, not decorate a generic landing page.

## Reskin Test — HARD GATE

> If logo, company name, accent colour and images were replaced, could this exact interface represent an unrelated company?

If yes: FAIL. At least three independent design decisions must come from this business.

## Hard Gates

A project cannot pass while any applicable item fails:

1. No fabricated testimonials, reviews, metrics, awards, clients, stock, availability or live state.
2. No dead CTA presented as functional.
3. No broken route/navigation.
4. No unreadable critical text or contrast failure.
5. Keyboard access for interactive UI.
6. Visible focus state.
7. Respect `prefers-reduced-motion`.
8. No horizontal overflow at supported mobile widths.
9. No critical content hidden by viewport assumptions.
10. No placeholder/lorem in client-facing delivery.
11. No builder/framework residue.
12. No console-breaking errors in normal flows.
13. Images load and crop correctly.
14. Critical pages have deliberate mobile composition.
15. Reskin Test passes.
16. No unsubstantiated claim.
17. No fake product/browser/mockup used as evidence.
18. Motion never blocks reading or interaction.
19. No section exists only because landing pages usually have one.
20. Rendered visual QA is mandatory.
21. No accessibility regression for novelty.
22. Do not repeat one component when different content deserves different form.
23. No filler imagery that conflicts with truth.
24. Mobile CTAs/controls must have practical targets.
25. Delivery Gate explicitly completed.

## Purpose Gate

Cards, shadows, gradients, glass, pills, sticky elements, parallax, scroll reveals, video, carousels, marquees, serif, monospace, dark mode, split heroes, oversized type, border-heavy UI, bento, floating elements, glow, 3D, horizontal scrolling, full-bleed photography and animation loops are allowed only with a project-specific reason tied to hierarchy, identity, usability, materiality or content.

If the reason is only “premium/modern/cool”, reject it.

## Page intent contract

For every page define: primary job, audience, CTA, trust evidence, required content, optional content, next step, visual mode, mobile priority and what it must not become.

For every section define: question answered, why it belongs, unique content, what follows and why, and whether it deserves its own visual form.

Delete sections with no commercial, informational or experiential role.

## Quality locks

Check coherent type scale, intentional spacing rhythm, deliberate crops, complete interaction states, sensible motion, no dead zones, no orphan headings, no responsive collisions, useful form labels/validation, comfortable tap targets, 320/375/390/430/768/desktop behavior, 200% zoom, reduced-motion coherence, hero/LCP strategy, metadata/OG basics, no fake urgency and clear client ownership.

## Completion rule

Never claim done/client-ready/production-ready until `modules/qa.md` passes on the rendered product with 0 Hard Gate failures.
