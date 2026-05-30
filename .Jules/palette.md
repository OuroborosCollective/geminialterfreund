## 2025-05-15 - [Interactive Element Accessibility]
**Learning:** In highly interactive generators (like character creators), small touchpoints like color swatches and animation toggles often lack clear keyboard focus indicators and ARIA states, making them difficult to use for screen reader or keyboard-only users.
**Action:** Always ensure `aria-pressed` is used for selection/toggle states and `focus-visible` rings are applied to custom-styled buttons (like round color swatches) to maintain visibility during keyboard navigation.
