## 2025-05-29 - [Character Generator Accessibility]
**Learning:** In highly interactive procedural generators like this one, icon-only buttons (like the 🎲 dice) and color swatches are often missing proper screen reader labels and focus indicators, making them completely inaccessible to keyboard users.
**Action:** Always systematically audit selection grids (swatches, tabs, variant pickers) for `aria-pressed` and `focus-visible` rings. Use `focus-visible` to ensure the UI remains clean for mouse users while being functional for keyboard navigation.

## 2025-05-30 - [Icon Button Accessibility & Tooltips]
**Learning:** For buttons with cryptic icons (like direction arrows "↓ S"), simply providing an ARIA label is not enough for the best UX. Users benefit from visual tooltips, while screen readers need the descriptive label.
**Action:** Wrap icon-only or cryptic buttons in a `Tooltip`. Provide a descriptive `aria-label` (e.g., "Southwest") and wrap the visual content (e.g., "↙ SW") in `<span aria-hidden="true">` to prevent screen readers from reading the cryptic text. Ensure `TooltipProvider` is at the app root.
