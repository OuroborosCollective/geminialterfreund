export type RGB = [number, number, number];

export interface Palette {
  id: string;
  name: string;
  skin: RGB;
  skinShadow: RGB;
  hair: RGB;
  primary: RGB;
  secondary: RGB;
  metal: RGB;
  trim: RGB;
  accent: RGB;
  aura: RGB;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToStyle(rgb: RGB, alpha = 1): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

export function lighten(rgb: RGB, n: number): RGB {
  return [Math.min(255, rgb[0] + n), Math.min(255, rgb[1] + n), Math.min(255, rgb[2] + n)];
}

export function darken(rgb: RGB, n: number): RGB {
  return [Math.max(0, rgb[0] - n), Math.max(0, rgb[1] - n), Math.max(0, rgb[2] - n)];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

/** Build a full palette from skin + hair + armor scheme IDs */
import { SKIN_TONES, HAIR_COLORS, ARMOR_SCHEMES } from "./partDefinitions";

export function buildPalette(skinId: string, hairId: string, schemeId: string): Palette {
  const skin = SKIN_TONES.find(s => s.id === skinId) ?? SKIN_TONES[0];
  const hair = HAIR_COLORS.find(h => h.id === hairId) ?? HAIR_COLORS[0];
  const scheme = ARMOR_SCHEMES.find(s => s.id === schemeId) ?? ARMOR_SCHEMES[0];

  return {
    id: `${skinId}_${hairId}_${schemeId}`,
    name: `${skin.name} / ${hair.name} / ${scheme.name}`,
    skin: hexToRgb(skin.hex),
    skinShadow: hexToRgb(skin.shadow),
    hair: hexToRgb(hair.hex),
    primary: hexToRgb(scheme.primary),
    secondary: hexToRgb(scheme.secondary),
    metal: hexToRgb(scheme.metal),
    trim: hexToRgb(scheme.trim),
    accent: hexToRgb(scheme.trim),
    aura: [140, 80, 255],
  };
}

export const DEFAULT_PALETTE = buildPalette("s2", "brown", "leather_brown");
