## 2025-05-29 - [Character Generator Accessibility]
**Learning:** In highly interactive procedural generators like this one, icon-only buttons (like the 🎲 dice) and color swatches are often missing proper screen reader labels and focus indicators, making them completely inaccessible to keyboard users.
**Action:** Always systematically audit selection grids (swatches, tabs, variant pickers) for `aria-pressed` and `focus-visible` rings. Use `focus-visible` to ensure the UI remains clean for mouse users while being functional for keyboard navigation.

## 2025-05-30 - [Standardizing Contextual Tooltips]
**Learning:** For directional controls and cryptic icons, tooltips provide essential context. However, care must be taken to remove the native `title` attribute when using custom Tooltip components to prevent "double tooltips" in modern browsers.
**Action:** When wrapping a component in a custom `Tooltip`, ensure any legacy `title` attributes are removed from the trigger element.
