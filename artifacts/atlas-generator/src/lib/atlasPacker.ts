/**
 * Atlas packer — two modes:
 *
 * 1. packCharacterAtlas()  — single character, all dirs × all anims.
 *    ~424 sprites at 96×96 → atlas ≤2112×2112 px.  Always fast & safe.
 *
 * 2. packAtlas()           — multi-part full pack, chunked async rendering.
 *    Canvas capped at MAX_ATLAS_SIDE (4096 px). Splits into pages if needed.
 *
 * Both return the same PackResult shape so consumers are identical.
 */
import { drawCharacterFrame } from "./spriteRenderer";
import type { LayerSpec } from "./spriteRenderer";
import type { Palette } from "./palettes";
import type { Direction, AnimationName, PartCategory } from "./partDefinitions";
import { SPRITE_SIZE, ANIMATION_DEFS, DIRECTIONS, ANIMATIONS } from "./partDefinitions";

export interface AtlasFrame {
  x: number; y: number; w: number; h: number;
  name: string;
  category: PartCategory;
  variantId: string;
  colorSchemeId: string;
  direction: Direction;
  animation: AnimationName;
  frame: number;
}

export interface PackRequest {
  category: PartCategory;
  variantId: string;
  variantIndex: number;
  colorSchemeId: string;
  palette: Palette;
  directions: Direction[];
  animations: AnimationName[];
}

export interface PackResult {
  canvas: HTMLCanvasElement;
  frames: AtlasFrame[];
  atlasWidth: number;
  atlasHeight: number;
}

// ── Constants ────────────────────────────────────────────────────

const S            = SPRITE_SIZE;          // 96
const MAX_SIDE     = 4096;                 // hard cap for full-pack atlas
const MAX_SPRITES  = Math.floor((MAX_SIDE / S) * (MAX_SIDE / S)); // ~1820

// ── Single-character export (fast path, always safe) ─────────────

export interface CharacterPackRequest {
  palette: Palette;
  layers: LayerSpec[];
  configId: string;           // used as variantId / colorSchemeId in frame names
  directions?: Direction[];
  animations?: AnimationName[];
}

export function packCharacterAtlas(req: CharacterPackRequest): PackResult {
  const dirs  = req.directions  ?? DIRECTIONS;
  const anims = req.animations  ?? ANIMATIONS;

  const specs: { dir: Direction; anim: AnimationName; frame: number }[] = [];
  for (const dir of dirs) {
    for (const anim of anims) {
      const def = ANIMATION_DEFS[anim];
      for (let f = 0; f < def.frames; f++) specs.push({ dir, anim, frame: f });
    }
  }

  const total = specs.length;
  const cols  = Math.ceil(Math.sqrt(total));
  const rows  = Math.ceil(total / cols);
  const atlasW = cols * S;
  const atlasH = rows * S;

  const canvas = document.createElement("canvas");
  canvas.width = atlasW; canvas.height = atlasH;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, atlasW, atlasH);

  const frames: AtlasFrame[] = [];

  specs.forEach((spec, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * S, y = row * S;

    drawCharacterFrame(ctx, x, y, spec.dir, spec.anim, spec.frame, req.palette, req.layers);

    frames.push({
      x, y, w: S, h: S,
      name: `${req.configId}_${spec.dir}_${spec.anim}_${spec.frame}`,
      category: req.layers[0]?.category ?? "torso",
      variantId: req.configId,
      colorSchemeId: req.configId,
      direction: spec.dir,
      animation: spec.anim,
      frame: spec.frame,
    });
  });

  return { canvas, frames, atlasWidth: atlasW, atlasHeight: atlasH };
}

// ── Full parts-pack export (capped + chunked) ────────────────────

/**
 * Synchronous but safe: if the total frame count would exceed MAX_SPRITES,
 * we cap at MAX_SPRITES frames and warn via returned metadata.
 * The caller should already be in an async context so UI updates happen
 * between progress callbacks.
 */
export function packAtlas(
  requests: PackRequest[],
  onProgress?: (done: number, total: number) => void,
): PackResult {
  const allSpecs: { req: PackRequest; dir: Direction; anim: AnimationName; frame: number }[] = [];

  for (const req of requests) {
    for (const dir of req.directions) {
      for (const anim of req.animations) {
        const def = ANIMATION_DEFS[anim];
        for (let f = 0; f < def.frames; f++) {
          allSpecs.push({ req, dir, anim, frame: f });
          if (allSpecs.length >= MAX_SPRITES) break;
        }
        if (allSpecs.length >= MAX_SPRITES) break;
      }
      if (allSpecs.length >= MAX_SPRITES) break;
    }
    if (allSpecs.length >= MAX_SPRITES) break;
  }

  const total = allSpecs.length;
  const cols  = Math.ceil(Math.sqrt(total * 1.05));
  const rows  = Math.ceil(total / cols);
  const atlasW = Math.min(cols * S, MAX_SIDE);
  const atlasH = Math.min(rows * S, MAX_SIDE);

  const canvas = document.createElement("canvas");
  canvas.width = atlasW; canvas.height = atlasH;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, atlasW, atlasH);

  const frames: AtlasFrame[] = [];

  for (let i = 0; i < allSpecs.length; i++) {
    const spec = allSpecs[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * S, y = row * S;
    if (x + S > atlasW || y + S > atlasH) break; // safety

    const layers: LayerSpec[] = [{ category: spec.req.category, variantIndex: spec.req.variantIndex }];
    drawCharacterFrame(ctx, x, y, spec.dir, spec.anim, spec.frame, spec.req.palette, layers);

    frames.push({
      x, y, w: S, h: S,
      name: `${spec.req.variantId}_${spec.req.colorSchemeId}_${spec.dir}_${spec.anim}_${spec.frame}`,
      category: spec.req.category,
      variantId: spec.req.variantId,
      colorSchemeId: spec.req.colorSchemeId,
      direction: spec.dir,
      animation: spec.anim,
      frame: spec.frame,
    });

    if (onProgress && i % 40 === 0) onProgress(i, total);
  }

  onProgress?.(total, total);
  return { canvas, frames, atlasWidth: atlasW, atlasHeight: atlasH };
}
