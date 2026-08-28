# ARCHIC MOTION STANDARD v2

## Purpose

Motion must improve orientation, hierarchy, feedback, storytelling or perceived craft.

## Priority

1. interaction feedback
2. navigation / spatial continuity
3. content emphasis
4. editorial storytelling
5. ambient decoration

## Defaults

- short, crisp transitions for controls
- slightly longer transitions for spatial/layout changes
- natural easing; do not use one identical duration/easing everywhere
- stagger only when sequence helps reading
- do not animate every section on scroll
- never make users wait for content
- no continuously floating/bobbing cards
- no universal hover-lift + shadow + glow behavior
- no scroll hijacking
- no unpredictable layout-changing motion
- no parallax merely to signal premium
- do not hide critical/LCP text behind entrance animation

## Required

- `prefers-reduced-motion` path
- focus/pressed/active feedback
- no blurry text transforms
- no clipped animated shadow/glow
- no reflow jank
- motion tested on mobile
- interaction never blocked by animation

## Project motion thesis

See `PROJECT-DESIGN.md`.

**MOTION THESIS:** precise and mechanical. Movement should communicate progress through the project/route, state and direction; decoration stays rare.
