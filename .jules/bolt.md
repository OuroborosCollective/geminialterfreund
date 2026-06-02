## 2025-05-15 - [Initial Entry]
**Learning:** Performance-obsessed agent Bolt reporting for duty.
**Action:** Always measure before optimizing. I will focus on reducing GC pressure and redundant calculations in the rendering loop.
## 2025-05-15 - Canvas Reuse and Layer Lookup Optimization
**Learning:** In high-frequency rendering loops (like character animations), repeated allocations of offscreen canvases via `document.createElement('canvas')` create significant GC pressure. Reusing a single "scratch" canvas for intermediate draw steps (e.g., 96x96 base frame before scaling) eliminates these transient objects. Additionally, converting array-based layer lookups to an object-based map within `drawCharacterFrame` reduces lookup complexity from O(K*N) to O(N).
**Action:** Always check for canvas allocations in hot paths like animation frames or grid renders and replace with a pooled/scratch canvas utility.
## 2025-05-15 - Pattern-based Background Optimization
**Learning:** For repetitive backgrounds like checkerboards, using `ctx.createPattern` with a cached `CanvasPattern` is significantly more efficient than nested loops of `fillRect`. It reduces the number of API calls sent to the graphics context from hundreds/thousands to just one.
**Action:** Centralize pattern-based rendering in a utility and cache the pattern instances to avoid redundant memory allocation.
