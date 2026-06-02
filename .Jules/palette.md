## 2025-05-29 - [Character Generator Accessibility]
**Learning:** In highly interactive procedural generators like this one, icon-only buttons (like the 🎲 dice) and color swatches are often missing proper screen reader labels and focus indicators, making them completely inaccessible to keyboard users.
**Action:** Always systematically audit selection grids (swatches, tabs, variant pickers) for `aria-pressed` and `focus-visible` rings. Use `focus-visible` to ensure the UI remains clean for mouse users while being functional for keyboard navigation.

## 2025-06-01 - [Standardizing Tooltips for Visual Controls]
**Learning:** For procedural editors with many small visual-only controls (arrows, colors, icons), native `title` attributes are inconsistent and often inaccessible. Using a custom `Tooltip` component provides a polished feel, but requires a global `TooltipProvider` and careful removal of native `title` attributes to avoid "double tooltips" in some browsers.
**Action:** When adding custom tooltips to existing buttons, replace `title` with `Tooltip` + `TooltipContent` and ensure the button has a matching `aria-label`. Wrap visual icons in `<span aria-hidden="true">` to keep the DOM clean for screen readers.
