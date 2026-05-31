## 2025-05-15 - [Initial Entry]
**Learning:** Performance-obsessed agent Bolt reporting for duty.
**Action:** Always measure before optimizing. I will focus on reducing GC pressure and redundant calculations in the rendering loop.
## 2025-05-15 - Canvas Reuse and Layer Lookup Optimization
**Learning:** In high-frequency rendering loops (like character animations), repeated allocations of offscreen canvases via `document.createElement('canvas')` create significant GC pressure. Reusing a single "scratch" canvas for intermediate draw steps (e.g., 96x96 base frame before scaling) eliminates these transient objects. Additionally, converting array-based layer lookups to an object-based map within `drawCharacterFrame` reduces lookup complexity from O(K*N) to O(N).
**Action:** Always check for canvas allocations in hot paths like animation frames or grid renders and replace with a pooled/scratch canvas utility.
## 2025-05-16 - Checkerboard Pattern Optimization
**Learning:** Rendering high-frequency checkerboard backgrounds using nested loops and hundreds of `fillRect` calls per frame is a significant bottleneck for the main thread. Utilizing `CanvasPattern` reduces the drawing operation to a single O(1) `fillRect` call, offloading the tile repetition to the graphics engine. Caching patterns by tile size prevents redundant offscreen canvas allocations.
**Action:** Replace manual repetition loops in Canvas rendering with patterns or cached sprites whenever possible.
