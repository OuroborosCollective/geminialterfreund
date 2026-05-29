/**
 * Deterministic character assembly from a numeric seed.
 * Classless RuneScape-style: any part can combine with any other part.
 */
import { createPRNG } from "./prng";
import { buildPalette, type Palette } from "./palettes";
import {
  RENDER_LAYER_ORDER,
  ALL_VARIANTS,
  SKIN_TONES,
  HAIR_COLORS,
  ARMOR_SCHEMES,
  type PartCategory,
} from "./partDefinitions";
import type { LayerSpec } from "./spriteRenderer";

export interface CharacterConfig {
  seed: number;
  palette: Palette;
  layers: LayerSpec[];
  aliases: Record<PartCategory, string>;
  tags: {
    skinId: string;
    hairColorId: string;
    schemeId: string;
    tier: number;
  };
}

export function assembleCharacter(seed: number): CharacterConfig {
  const prng = createPRNG(seed);

  const skinId   = prng.pick(SKIN_TONES).id;
  const hairId   = prng.pick(HAIR_COLORS).id;
  const schemeId = prng.pick(ARMOR_SCHEMES).id;
  const palette  = buildPalette(skinId, hairId, schemeId);
  palette.aura   = [
    Math.floor(prng.next() * 180 + 60),
    Math.floor(prng.next() * 180 + 60),
    Math.floor(prng.next() * 255),
  ];

  const layers: LayerSpec[] = [];
  const aliases: Record<string, string> = {};

  for (const cat of RENDER_LAYER_ORDER) {
    const variants = ALL_VARIANTS[cat as keyof typeof ALL_VARIANTS];
    if (!variants || variants.length === 0) continue;

    const fork = prng.fork(cat.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 17));
    const variant = fork.pick(variants);

    layers.push({ category: cat, variantIndex: variant.shapeCode });
    aliases[cat] = variant.id;
  }

  const avgTier = layers.reduce((sum, l) => {
    const cat = l.category as keyof typeof ALL_VARIANTS;
    const v = ALL_VARIANTS[cat]?.[l.variantIndex];
    return sum + (v?.tier ?? 1);
  }, 0) / layers.length;

  return {
    seed,
    palette,
    layers,
    aliases: aliases as Record<PartCategory, string>,
    tags: { skinId, hairColorId: hairId, schemeId, tier: Math.round(avgTier) },
  };
}

export function swapLayer(
  config: CharacterConfig,
  category: PartCategory,
  variantIndex: number,
): CharacterConfig {
  const newLayers = config.layers.map(l =>
    l.category === category ? { ...l, variantIndex } : l,
  );
  const variant = ALL_VARIANTS[category as keyof typeof ALL_VARIANTS]?.[variantIndex];
  const newAliases = { ...config.aliases, [category]: variant?.id ?? `${category}_${variantIndex}` };
  return { ...config, layers: newLayers, aliases: newAliases as Record<PartCategory, string> };
}
