# ARCHIC DELIVERY GATE v2

A project is not complete until this gate is evaluated against the rendered product.

## A. Business specificity — 20

- [ ] Design Thesis exists and is visible in product decisions (4)
- [ ] Business-Native Primitive exists (4)
- [ ] Reskin Test passes (5)
- [ ] at least three client-specific design decisions are identifiable (4)
- [ ] page/section structure follows actual business needs (3)

**Fail the entire gate if the Reskin Test fails.**

## B. Visual craft — 20

- [ ] hierarchy clear (3)
- [ ] typography coherent and context-specific (3)
- [ ] spacing/rhythm intentional (3)
- [ ] imagery sharp, relevant and well-cropped (4)
- [ ] components consistent without becoming templated (3)
- [ ] details survive desktop + mobile inspection (4)

## C. Interaction & motion — 15

- [ ] complete control states (3)
- [ ] motion has purpose (3)
- [ ] no animation jank/clipping (3)
- [ ] reduced-motion works (3)
- [ ] keyboard/focus works (3)

## D. Mobile — 15

- [ ] no overflow (3)
- [ ] mobile hierarchy independently composed (3)
- [ ] touch targets/CTAs practical (3)
- [ ] imagery/crops work (3)
- [ ] nav + critical flows work (3)

## E. Truth & content — 10

- [ ] no fabricated proof/metrics/reviews (3)
- [ ] no placeholder copy (2)
- [ ] copy business-specific (2)
- [ ] CTAs describe real actions (2)
- [ ] no false real-time/availability language (1)

## F. Technical quality — 10

- [ ] no critical console errors (2)
- [ ] routes/links work (2)
- [ ] forms/critical interactions work (2)
- [ ] images/assets load (2)
- [ ] metadata/favicon/client-ready basics present (2)

## G. Accessibility/performance — 10

- [ ] contrast/focus/labels acceptable (3)
- [ ] zoom/reflow usable (2)
- [ ] hero/LCP strategy reasonable (2)
- [ ] avoid CLS-prone missing dimensions (1)
- [ ] no gratuitous JS harming interaction latency (1)
- [ ] semantic HTML/ARIA appropriate (1)

## Score

- 95–100 exceptional
- 90–94 flagship
- 84–89 strong client-ready
- 80–83 acceptable but improve
- <80 do not deliver

Additional hard rule: home target >= 82, critical pages/mobile >= 80, and **0 Hard Gate failures**.

## Required evidence

```text
ARCHIC DELIVERY REPORT
Project:
Date:
Build:
Desktop inspected:
Mobile widths inspected:
Critical routes tested:
Hard Gate failures: 0
Reskin Test: PASS/FAIL
Score:
Known limitations:
Fixes made during final QA:
```

Do not self-award a passing score without inspecting rendered UI.
