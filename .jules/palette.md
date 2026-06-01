## 2025-05-14 - Visual Color Selection with Tooltips
**Learning:** Standard `<select>` dropdowns for color schemes provide poor visual feedback. Replacing them with a grid of color swatches significantly improves the user's ability to preview options. However, using both a `title` attribute and a custom `Tooltip` component can lead to "double tooltips" in some browsers.
**Action:** Use a `flex-wrap` grid of buttons for color selection. Wrap buttons in the project's `Tooltip` component for descriptive names, and ensure the native `title` attribute is removed to avoid redundant UI elements.
