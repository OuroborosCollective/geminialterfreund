/**
 * Sprite Library — loads and caches the AI-generated character base sprites.
 * Maps equipment scheme → visual archetype → pose image.
 *
 * Since Areloria is classless, the "type" is purely visual — determined by
 * which equipment tier the character is wearing, not a locked class.
 */

export type PoseKey   = "idle" | "walk" | "attack";
export type SpriteType = "knight" | "mage" | "rogue" | "paladin" | "ranger" | "necromancer";

/** Map armor scheme → visual archetype (classless — purely cosmetic) */
export function schemeToSpriteType(schemeId: string): SpriteType {
  if (schemeId.startsWith("magic_"))                                 return "mage";
  if (schemeId === "plate_royal" || schemeId === "plate_gold"
   || schemeId === "plate_crimson")                                  return "paladin";
  if (schemeId.includes("plate") || schemeId.includes("chain"))      return "knight";
  if (schemeId === "leather_black" || schemeId === "cloth_black")    return "necromancer";
  if (schemeId.includes("leather"))                                  return "rogue";
  return "ranger";
}

const BASE = "/sprites";

export const SPRITE_PATHS: Record<SpriteType, Partial<Record<PoseKey, string>>> = {
  knight:      { idle: `${BASE}/knight_south_idle.png`,  walk: `${BASE}/knight_south_walk.png`,  attack: `${BASE}/knight_south_attack.png` },
  mage:        { idle: `${BASE}/mage_south_idle.png`,    walk: `${BASE}/mage_south_walk.png` },
  rogue:       { idle: `${BASE}/rogue_south_idle.png`,   walk: `${BASE}/rogue_south_walk.png` },
  paladin:     { idle: `${BASE}/paladin_south_idle.png` },
  ranger:      { idle: `${BASE}/ranger_south_idle.png` },
  necromancer: { idle: `${BASE}/necro_south_idle.png` },
};

// ── Image cache ───────────────────────────────────────────────────

const _cache = new Map<string, HTMLImageElement | null>();
let _loadPromise: Promise<void> | null = null;

async function loadOne(src: string): Promise<void> {
  return new Promise(resolve => {
    if (_cache.has(src)) { resolve(); return; }
    const img = new Image();
    img.onload  = () => { _cache.set(src, img); resolve(); };
    img.onerror = () => { _cache.set(src, null); resolve(); }; // null = missing
    img.src = src;
  });
}

export async function preloadAllSprites(): Promise<void> {
  if (_loadPromise) return _loadPromise;
  const allPaths = new Set<string>();
  for (const poses of Object.values(SPRITE_PATHS)) {
    for (const p of Object.values(poses)) if (p) allPaths.add(p);
  }
  _loadPromise = Promise.all([...allPaths].map(loadOne)).then(() => {});
  return _loadPromise;
}

export function getCachedSprite(path: string): HTMLImageElement | null {
  return _cache.get(path) ?? null;
}

export function getSpriteFor(type: SpriteType, pose: PoseKey): HTMLImageElement | null {
  const paths = SPRITE_PATHS[type];
  const path  = paths[pose] ?? paths["idle"];
  if (!path) return null;
  return getCachedSprite(path);
}

export function getSpritesLoaded(): boolean {
  return _loadPromise !== null && [..._cache.values()].some(v => v !== undefined);
}
