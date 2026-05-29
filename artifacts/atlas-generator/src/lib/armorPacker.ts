/**
 * Armor Atlas Packer
 *
 * Packs all armor pieces (8 slots × 36 variants × 8 dirs × N animations) onto
 * a size-capped atlas canvas. Same safety constraints as atlasPacker.ts.
 *
 * Frame naming (deterministic):
 *   {slot}_{nn:02d}_{materialId}_{shapeName}_{dir}_{anim}_{frame}
 *
 * E.g.: helm_05_cloth_blue_simple_south_idle_0
 */
import { drawArmorPiece } from "./armorRenderer";
import type { ArmorSlot, ArmorShapeIndex } from "./armorDefinitions";
import { ALL_ARMOR_VARIANTS, ARMOR_SLOTS } from "./armorDefinitions";
import type { Direction, AnimationName } from "./partDefinitions";
import { SPRITE_SIZE, ANIMATION_DEFS, DIRECTIONS, ANIMATIONS } from "./partDefinitions";

export interface ArmorFrame {
  x: number; y: number; w: number; h: number;
  name: string;
  slot: ArmorSlot;
  variantId: string;
  materialId: string;
  shapeId: string;
  tier: number;
  direction: Direction;
  animation: AnimationName;
  frame: number;
}

export interface ArmorPackRequest {
  slot: ArmorSlot;
  materialIndex: number;
  materialId: string;
  shapeIndex: ArmorShapeIndex;
  shapeId: string;
  variantId: string;
  tier: number;
  num: number;
  directions: Direction[];
  animations: AnimationName[];
}

export interface ArmorPackResult {
  canvas: HTMLCanvasElement;
  frames: ArmorFrame[];
  atlasWidth: number;
  atlasHeight: number;
}

const S           = SPRITE_SIZE;
const MAX_SIDE    = 4096;
const MAX_SPRITES = Math.floor((MAX_SIDE / S) * (MAX_SIDE / S));

export function buildArmorRequests(
  slots: ArmorSlot[],
  dirs: Direction[],
  anims: AnimationName[],
): ArmorPackRequest[] {
  const requests: ArmorPackRequest[] = [];
  for (const slot of slots) {
    for (const variant of ALL_ARMOR_VARIANTS[slot]) {
      requests.push({
        slot,
        materialIndex: variant.materialIndex,
        materialId:    variant.material.id,
        shapeIndex:    variant.shapeIndex,
        shapeId:       variant.shapeName,
        variantId:     variant.id,
        tier:          variant.tier,
        num:           variant.num,
        directions:    dirs,
        animations:    anims,
      });
    }
  }
  return requests;
}

export function packArmorAtlas(
  requests: ArmorPackRequest[],
  onProgress?: (done: number, total: number) => void,
): ArmorPackResult {
  const specs: { req: ArmorPackRequest; dir: Direction; anim: AnimationName; frame: number }[] = [];

  for (const req of requests) {
    for (const dir of req.directions) {
      for (const anim of req.animations) {
        const def = ANIMATION_DEFS[anim];
        for (let f = 0; f < def.frames; f++) {
          specs.push({ req, dir, anim, frame: f });
          if (specs.length >= MAX_SPRITES) break;
        }
        if (specs.length >= MAX_SPRITES) break;
      }
      if (specs.length >= MAX_SPRITES) break;
    }
    if (specs.length >= MAX_SPRITES) break;
  }

  const total  = specs.length;
  const cols   = Math.ceil(Math.sqrt(total * 1.05));
  const rows   = Math.ceil(total / cols);
  const atlasW = Math.min(cols * S, MAX_SIDE);
  const atlasH = Math.min(rows * S, MAX_SIDE);

  const canvas = document.createElement("canvas");
  canvas.width = atlasW; canvas.height = atlasH;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, atlasW, atlasH);

  const frames: ArmorFrame[] = [];

  for (let i = 0; i < specs.length; i++) {
    const { req, dir, anim, frame } = specs[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * S, y = row * S;
    if (x + S > atlasW || y + S > atlasH) break;

    drawArmorPiece(ctx, x, y, req.slot, req.materialIndex, req.shapeIndex, dir, anim, frame);

    frames.push({
      x, y, w: S, h: S,
      name: `${req.variantId}_${dir}_${anim}_${frame}`,
      slot: req.slot,
      variantId: req.variantId,
      materialId: req.materialId,
      shapeId: req.shapeId,
      tier: req.tier,
      direction: dir,
      animation: anim,
      frame,
    });

    if (onProgress && i % 40 === 0) onProgress(i, total);
  }

  onProgress?.(total, total);
  return { canvas, frames, atlasWidth: atlasW, atlasHeight: atlasH };
}

/** Build armor atlas.json (PixiJS TexturePacker Hash format) */
export function buildArmorManifest(frames: ArmorFrame[], w: number, h: number) {
  const pixi: Record<string, object> = {};
  const animGroups: Record<string, string[]> = {};

  for (const f of frames) {
    pixi[f.name] = {
      frame: { x: f.x, y: f.y, w: f.w, h: f.h },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: S, h: S },
      sourceSize: { w: S, h: S },
      pivot: { x: 0.5, y: 0.9 },
    };
    const key = `${f.variantId}_${f.direction}_${f.animation}`;
    if (!animGroups[key]) animGroups[key] = [];
    animGroups[key].push(f.name);
  }

  for (const key of Object.keys(animGroups)) {
    animGroups[key].sort((a, b) => {
      const af = parseInt(a.split("_").pop() ?? "0", 10);
      const bf = parseInt(b.split("_").pop() ?? "0", 10);
      return af - bf;
    });
  }

  const slotInfo: Record<string, { count: number; variantIds: string[] }> = {};
  for (const f of frames) {
    if (!slotInfo[f.slot]) slotInfo[f.slot] = { count: 0, variantIds: [] };
    if (!slotInfo[f.slot].variantIds.includes(f.variantId)) {
      slotInfo[f.slot].variantIds.push(f.variantId);
      slotInfo[f.slot].count++;
    }
  }

  return {
    meta: {
      app: "Areloria Armor Atlas Generator",
      version: "1.0.0",
      image: "armor_atlas.png",
      format: "RGBA8888",
      size: { w, h },
      scale: "1",
      generated: new Date().toISOString(),
      spriteSize: S,
      totalFrames: frames.length,
      totalVariants: new Set(frames.map(f => f.variantId)).size,
      naming: "{slot}_{nn:02d}_{materialId}_{shapeName}_{dir}_{anim}_{frame}",
      armorSystem: "Transparent overlays — stack on character sprites at same anchor (0.5, 0.9)",
      slots: slotInfo,
    },
    frames: pixi,
    animations: animGroups,
  };
}

/** Build armor layers.json */
export function buildArmorLayersDef(frames: ArmorFrame[]) {
  const bySlot: Record<string, { variants: number; tiers: number[] }> = {};
  for (const f of frames) {
    if (!bySlot[f.slot]) bySlot[f.slot] = { variants: 0, tiers: [] };
    if (!bySlot[f.slot].tiers.includes(f.tier)) bySlot[f.slot].tiers.push(f.tier);
    // Count unique variants
  }

  return {
    version: "1.0.0",
    naming: {
      variantId: "{slot}_{nn:02d}_{materialId}_{shapeName}",
      frameKey:  "{variantId}_{dir}_{anim}_{frame}",
      animGroup: "{variantId}_{dir}_{anim}",
      decode:    "nn = (materialIndex * 4) + shapeIndex + 1   (1-indexed, 1..36 per slot)",
    },
    materialTiers: {
      1: "Cloth (cloth_white, cloth_blue, cloth_red, cloth_dark)",
      2: "Leather (leather_brown, leather_dark)",
      3: "Metal (chainmail, iron)",
      4: "Plate (steel)",
    },
    shapes: {
      0: "simple — minimal coverage, clean lines",
      1: "reinforced — structural elements, rivets/straps visible",
      2: "ornate — decorative details, complex trim",
      3: "elite — legendary design, unique silhouette",
    },
    slots: ARMOR_SLOTS.map(s => ({
      slot: s,
      variantsPerSlot: 36,
      zIndex: { helm:10, chest:5, legs:3, boots:4, gloves:6, cape:1, bracers:7, shoulders:8 }[s],
    })),
    pixijsLayering: `\
// Stack armor over character — same position, same anchor, zIndex above body
function addArmor(characterContainer, armorSheet, configId, slotName, variantId, dir, anim) {
  const animKey = variantId + '_' + dir + '_' + anim;
  const textures = armorSheet.animations[animKey];
  if (!textures) return;
  
  const armorSprite = new PIXI.AnimatedSprite(textures);
  armorSprite.anchor.set(0.5, 0.9);    // same as character body
  armorSprite.zIndex = SLOT_Z_INDEX[slotName];
  armorSprite.label = 'armor_' + slotName;
  
  characterContainer.addChild(armorSprite);
  characterContainer.sortChildren();
  
  // Sync to character body animation
  const bodySprite = characterContainer.getChildByLabel('torso');
  if (bodySprite) {
    bodySprite.onFrameChange = (frame) => armorSprite.gotoAndStop(frame);
  }
}`,
  };
}
