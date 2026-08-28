# ARCHIC MOBILE STANDARD v2

Mobile is not desktop compressed.

## Mandatory decisions for every critical page

Decide deliberately:

- content priority
- hero height and crop
- CTA placement
- nav behavior
- density
- card/list form
- media order
- sticky behavior
- text measure
- touch target size
- whether desktop-only decoration disappears

## Hard gates

- no horizontal overflow
- no text below usable reading size
- no CTA obscured by browser chrome
- no hover-only meaning
- no tiny inline actions
- no accidental `100vh` trapping
- no crop that removes the product subject
- no giant desktop headline leaving 1–2 words per line
- no section whose only role is decorative desktop composition
- no carousel that traps scroll
- no desktop multi-column table pasted unchanged into phone width

## Composition patterns

Choose based on content: editorial stack, media-first, action-first, compact catalogue, progressive disclosure, horizontal snap only for a genuinely browsable set, sticky CTA only when repeated access materially improves the task.

## QA widths

Inspect at minimum: 320, 375, 390/393, 430, 768 and desktop. One iPhone width is not enough.
