## 2025-05-29 - [Character Generator Accessibility]
**Learning:** In highly interactive procedural generators like this one, icon-only buttons (like the 🎲 dice) and color swatches are often missing proper screen reader labels and focus indicators, making them completely inaccessible to keyboard users.
**Action:** Always systematically audit selection grids (swatches, tabs, variant pickers) for `aria-pressed` and `focus-visible` rings. Use `focus-visible` to ensure the UI remains clean for mouse users while being functional for keyboard navigation.

## 2024-05-31 - [Emoji and Icon Button Accessibility Pattern]
**Learning:** Buttons using emojis (like 🎲) or cryptic directional icons as primary content cause screen readers to announce the character description, which is often confusing. Wrapping the visual content in `aria-hidden="true"` while providing a descriptive `aria-label` (e.g., "North West" instead of "NW") provides a much cleaner experience for assistive technology.
**Action:** In procedural UIs, always map shorthand/iconic values to full descriptive labels for `aria-label` and hide the decorative emoji/icon.
