/**
 * Builds PixiJS-compatible atlas manifests.
 *
 * Output files:
 *  atlas.json      — TexturePacker Hash format, directly loadable by PIXI.Assets
 *  animations.json — FPS / loop / frame-count per animation name
 *  layers.json     — Armor slot system for runtime equipment swapping in PixiJS
 */
import { ANIMATION_DEFS, DIRECTIONS, RENDER_LAYER_ORDER, SPRITE_SIZE } from "./partDefinitions";
import type { AnimationName, PartCategory } from "./partDefinitions";
import type { AtlasFrame } from "./atlasPacker";

// ── PixiJS TexturePacker Hash format ─────────────────────────────

export interface PixiFrameData {
  frame: { x: number; y: number; w: number; h: number };
  rotated: false;
  trimmed: false;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  pivot?: { x: number; y: number };
}

export interface AtlasManifest {
  meta: {
    app: string;
    version: string;
    image: string;
    format: "RGBA8888";
    size: { w: number; h: number };
    scale: string;
    generated: string;
    spriteSize: number;
    totalFrames: number;
    totalParts: number;
    armorSystem: string;
  };
  frames: Record<string, PixiFrameData>;
  animations: Record<string, string[]>;
}

export function buildAtlasManifest(
  frames: AtlasFrame[],
  atlasWidth: number,
  atlasHeight: number,
): AtlasManifest {
  const S = SPRITE_SIZE;
  const pixi: Record<string, PixiFrameData> = {};
  const animGroups: Record<string, string[]> = {};

  for (const f of frames) {
    pixi[f.name] = {
      frame: { x: f.x, y: f.y, w: f.w, h: f.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: S, h: S },
      sourceSize: { w: S, h: S },
      pivot: { x: 0.5, y: 0.9 }, // anchor at feet center for isometric placement
    };
    const animKey = `${f.variantId}_${f.colorSchemeId}_${f.direction}_${f.animation}`;
    if (!animGroups[animKey]) animGroups[animKey] = [];
    animGroups[animKey].push(f.name);
  }

  for (const key of Object.keys(animGroups)) {
    animGroups[key].sort((a, b) => {
      const aF = parseInt(a.split("_").pop() ?? "0", 10);
      const bF = parseInt(b.split("_").pop() ?? "0", 10);
      return aF - bF;
    });
  }

  return {
    meta: {
      app: "Areloria Character Atlas Generator",
      version: "3.0.0",
      image: "atlas.png",
      format: "RGBA8888",
      size: { w: atlasWidth, h: atlasHeight },
      scale: "1",
      generated: new Date().toISOString(),
      spriteSize: S,
      totalFrames: frames.length,
      totalParts: new Set(frames.map(f => f.variantId)).size,
      armorSystem: "layered — see layers.json for slot definitions and PixiJS assembly code",
    },
    frames: pixi,
    animations: animGroups,
  };
}

// ── animations.json ───────────────────────────────────────────────

export interface AnimationsDef {
  version: string;
  spriteSize: number;
  anchorY: number;
  definitions: Record<AnimationName, {
    fps: number;
    loop: boolean;
    frames: number;
    principle: string;
  }>;
  usage: string;
}

const ANIM_PRINCIPLES: Record<AnimationName, string> = {
  idle:     "Breathing bob — chest rises/falls, subtle squash at peak exhale",
  walk:     "8-frame cycle — body dips at mid-stance, arms counter-swing, no weapons",
  run:      "Exaggerated walk + forward lean — more extreme squash/stretch",
  attack:   "3-phase: wind-up anticipation (squash) → STRIKE (stretch) → rebound",
  cast:     "Rise upward gathering energy → peak extend → release → settle",
  hurt:     "Impact squash → hard recoil → return — secondary flash effect in game",
  death:    "Accelerating fall + rotation + alpha fade — gravity simulation",
  interact: "Lean and reach forward — arm extends toward interaction point",
  emote:    "Celebratory bounce — exaggerated squash/stretch for personality",
  sit:      "Body compresses into seated position — scaleY 0.87-0.88",
};

export function buildAnimationsDef(): AnimationsDef {
  return {
    version: "3.0.0",
    spriteSize: SPRITE_SIZE,
    anchorY: 0.9,
    definitions: Object.fromEntries(
      Object.entries(ANIMATION_DEFS).map(([name, def]) => [name, {
        fps: def.fps,
        loop: def.loop,
        frames: def.frames,
        principle: ANIM_PRINCIPLES[name as AnimationName],
      }])
    ) as AnimationsDef["definitions"],
    usage: "Frame key: '{configId}_{direction}_{animation}_{frameIndex}' — use animations map for AnimatedSprite",
  };
}

// ── layers.json — PixiJS armor slot system ────────────────────────

export interface ArmorSlot {
  zIndex: number;
  anchorPercent: { x: number; y: number };
  description: string;
  swapAtRuntime: boolean;
  defaultVariant: string;
}

export interface LayersDef {
  version: string;
  spriteSize: number;
  renderOrder: PartCategory[];
  directions: string[];
  naming: { frame: string; animGroup: string };
  pixijsAssembly: {
    description: string;
    containerSetup: string;
    syncCode: string;
    equipSwap: string;
    directionSwitch: string;
  };
  armorSlots: Record<string, ArmorSlot>;
  categories: Record<string, { count: number; ids: string[] }>;
}

export function buildLayersDef(frames: AtlasFrame[]): LayersDef {
  const categories: Record<string, { count: number; ids: string[] }> = {};
  for (const f of frames) {
    if (!categories[f.category]) categories[f.category] = { count: 0, ids: [] };
    if (!categories[f.category].ids.includes(f.variantId)) {
      categories[f.category].ids.push(f.variantId);
      categories[f.category].count++;
    }
  }

  return {
    version: "3.0.0",
    spriteSize: SPRITE_SIZE,
    renderOrder: RENDER_LAYER_ORDER,
    directions: [...DIRECTIONS],
    naming: {
      frame:     "{configId}_{direction}_{animation}_{frameIndex}",
      animGroup: "{configId}_{direction}_{animation}",
    },

    // ── PixiJS 8 assembly pattern ─────────────────────────────────
    pixijsAssembly: {
      description:
        "Each equipment slot is a separate PIXI.AnimatedSprite sharing the same anchor and timing. " +
        "Stack all slots as children of a single PIXI.Container. Sync via onFrameChange. " +
        "Swap equipment by replacing .textures on the relevant slot sprite.",

      containerSetup: `\
// PixiJS 8 — Layered Character Assembly (no weapons in base sprites)
import * as PIXI from 'pixi.js';

const RENDER_ORDER = ${JSON.stringify(RENDER_LAYER_ORDER, null, 2)};
const ANIMATION_FPS = { idle:4, walk:10, run:14, attack:12, cast:8, hurt:8, death:8, interact:6, emote:6, sit:4 };

async function createCharacter(atlasUrl, configId, initialDir = 'south', initialAnim = 'idle') {
  const sheet = await PIXI.Assets.load(atlasUrl); // loads atlas.json + atlas.png

  const container = new PIXI.Container();
  container.sortableChildren = true;

  const slots = {};

  // Create one AnimatedSprite per visible layer
  for (const [i, slotName] of RENDER_ORDER.entries()) {
    const animKey = \`\${configId}_\${initialDir}_\${initialAnim}\`;
    const textures = sheet.animations[animKey];
    if (!textures) continue;

    const sprite = new PIXI.AnimatedSprite(textures);
    sprite.anchor.set(0.5, 0.9);     // feet-anchored for isometric tile placement
    sprite.animationSpeed = ANIMATION_FPS[initialAnim] / 60;
    sprite.zIndex = i;
    sprite.label = slotName;

    slots[slotName] = sprite;
    container.addChild(sprite);
  }

  // Sync all layers: when body advances a frame, all others follow
  const bodySprite = slots['torso'] ?? Object.values(slots)[0];
  bodySprite.onFrameChange = (frame) => {
    for (const [name, sprite] of Object.entries(slots)) {
      if (sprite !== bodySprite) sprite.gotoAndStop(frame);
    }
  };

  bodySprite.play();
  return { container, slots, sheet };
}`,

      syncCode: `\
// Sync all slot sprites to the same frame
function syncSlots(slots, frame) {
  for (const sprite of Object.values(slots)) sprite.gotoAndStop(frame);
}`,

      equipSwap: `\
// Equipment swap at runtime — no rebuild needed
function equipItem(slots, sheet, configId, slotName, newItemId, currentDir, currentAnim) {
  const sprite = slots[slotName];
  if (!sprite) return;

  // Build the new animation key for this item variant
  const animKey = \`\${configId}_\${newItemId}_\${currentDir}_\${currentAnim}\`;
  const newTextures = sheet.animations[animKey];
  if (!newTextures) { console.warn('Missing textures for', animKey); return; }

  const currentFrame = sprite.currentFrame;
  sprite.textures = newTextures;
  sprite.gotoAndStop(currentFrame); // stay on same frame for seamless swap
}`,

      directionSwitch: `\
// 8-direction switch — swap ALL slots to new direction
function setDirection(slots, sheet, configId, newDir, currentAnim) {
  for (const [slotName, sprite] of Object.entries(slots)) {
    const animKey = \`\${configId}_\${newDir}_\${currentAnim}\`;
    const textures = sheet.animations[animKey];
    if (textures) {
      const f = sprite.currentFrame;
      sprite.textures = textures;
      sprite.gotoAndStop(f);
    }
  }
}`,
    },

    armorSlots: {
      aura:      { zIndex:0,  anchorPercent:{x:0.5,y:0.48}, description:"Magical aura effect — behind all body parts", swapAtRuntime:true,  defaultVariant:"none"   },
      cape:      { zIndex:1,  anchorPercent:{x:0.5,y:0.34}, description:"Back cape/cloak — behind torso",              swapAtRuntime:true,  defaultVariant:"none"   },
      legs:      { zIndex:2,  anchorPercent:{x:0.5,y:0.62}, description:"Leg armor / pants",                          swapAtRuntime:true,  defaultVariant:"cloth"  },
      boots:     { zIndex:3,  anchorPercent:{x:0.5,y:0.88}, description:"Footwear",                                   swapAtRuntime:true,  defaultVariant:"cloth"  },
      torso:     { zIndex:4,  anchorPercent:{x:0.5,y:0.42}, description:"Chest armor — primary body visual",          swapAtRuntime:true,  defaultVariant:"cloth"  },
      gloves:    { zIndex:5,  anchorPercent:{x:0.5,y:0.56}, description:"Hand armor / gloves",                       swapAtRuntime:true,  defaultVariant:"none"   },
      shoulders: { zIndex:6,  anchorPercent:{x:0.5,y:0.34}, description:"Pauldrons / shoulder armor",                swapAtRuntime:true,  defaultVariant:"none"   },
      head:      { zIndex:7,  anchorPercent:{x:0.5,y:0.18}, description:"Base head / face shape and skin",           swapAtRuntime:false, defaultVariant:"human"  },
      hair:      { zIndex:8,  anchorPercent:{x:0.5,y:0.15}, description:"Hair style",                               swapAtRuntime:true,  defaultVariant:"short"  },
      facial:    { zIndex:9,  anchorPercent:{x:0.5,y:0.22}, description:"Beard / war paint / mask details",         swapAtRuntime:true,  defaultVariant:"none"   },
      accessory: { zIndex:10, anchorPercent:{x:0.5,y:0.14}, description:"Head accessory: crown, helm, headband",     swapAtRuntime:true,  defaultVariant:"none"   },
    },

    categories: categories as LayersDef["categories"],
  };
}
