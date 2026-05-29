/**
 * Armor system — 8 slots × 9 materials × 4 shapes = 36 variants per slot (288 total)
 *
 * Naming convention (fully deterministic):
 *   variantId  = {slot}_{nn:02d}_{materialId}_{shapeName}
 *   frameKey   = {variantId}_{dir}_{anim}_{frame}
 *
 * Examples:
 *   helm_01_cloth_white_simple          (cloth white, simplest design)
 *   helm_04_cloth_white_elite           (cloth white, legendary design)
 *   helm_05_cloth_blue_simple           (cloth blue, simplest)
 *   helm_36_steel_elite                 (steel plate, legendary design)
 *   chest_09_leather_brown_simple_south_idle_0   (full frame key)
 */

export type ArmorSlot = "helm" | "chest" | "legs" | "boots" | "gloves" | "cape" | "bracers" | "shoulders";

export const ARMOR_SLOTS: ArmorSlot[] = [
  "helm", "chest", "legs", "boots", "gloves", "cape", "bracers", "shoulders",
];

export const ARMOR_SLOT_INFO: Record<ArmorSlot, { displayName: string; zIndex: number; description: string }> = {
  helm:      { displayName:"Helm",      zIndex:10, description:"Head protection — cap to full-face plate" },
  chest:     { displayName:"Chest",     zIndex: 5, description:"Torso armor — cloth tunic to heavy breastplate" },
  legs:      { displayName:"Legs",      zIndex: 3, description:"Leg armor — cloth pants to articulated greaves" },
  boots:     { displayName:"Boots",     zIndex: 4, description:"Footwear — sandals to articulated sabatons" },
  gloves:    { displayName:"Gloves",    zIndex: 6, description:"Hand armor — wraps to full plate gauntlets" },
  cape:      { displayName:"Cape",      zIndex: 1, description:"Back cape/cloak — short to full hooded" },
  bracers:   { displayName:"Bracers",   zIndex: 7, description:"Forearm guards — band to full vambrace" },
  shoulders: { displayName:"Shoulders", zIndex: 8, description:"Pauldrons — small cap to massive fantasy plates" },
};

// ── 9 Material Tiers (cloth T1 × 4, leather T2 × 2, metal T3 × 2, plate T4 × 1) ────

export type RGB = [number, number, number];

export interface ArmorMaterial {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  base: RGB;       // main surface color
  mid: RGB;        // mid-tone
  shadow: RGB;     // deep shadow
  trim: RGB;       // accent/trim
  specular: RGB;   // highlight/specular point
  metallic: number;  // 0=matte cloth, 1.0=mirror plate
  roughness: number; // 1=rough/woven, 0=polished
  index: number;     // 0-8
}

export const ARMOR_MATERIALS: ArmorMaterial[] = [
  // ── Tier 1: Cloth ──────────────────────────────────────────────
  { id:"cloth_white",   name:"White Cloth",    tier:1, index:0,
    base:[240,238,228], mid:[210,208,196], shadow:[165,162,148],
    trim:[255,255,245], specular:[255,255,255], metallic:0,   roughness:0.90 },
  { id:"cloth_blue",    name:"Blue Cloth",     tier:1, index:1,
    base:[100,125,195], mid:[75,100,165],  shadow:[48,72,128],
    trim:[150,180,235], specular:[200,225,255], metallic:0,   roughness:0.88 },
  { id:"cloth_red",     name:"Red Cloth",      tier:1, index:2,
    base:[188,52,52],   mid:[155,32,32],   shadow:[118,12,12],
    trim:[225,92,92],   specular:[255,145,145], metallic:0,   roughness:0.88 },
  { id:"cloth_dark",    name:"Dark Cloth",     tier:1, index:3,
    base:[52,48,68],    mid:[38,34,52],    shadow:[22,20,35],
    trim:[82,78,112],   specular:[115,108,145], metallic:0,   roughness:0.92 },

  // ── Tier 2: Leather ─────────────────────────────────────────────
  { id:"leather_brown", name:"Brown Leather",  tier:2, index:4,
    base:[142,88,48],   mid:[110,65,28],   shadow:[78,42,12],
    trim:[188,132,72],  specular:[228,178,115], metallic:0.20, roughness:0.72 },
  { id:"leather_dark",  name:"Dark Leather",   tier:2, index:5,
    base:[52,40,26],    mid:[38,28,14],    shadow:[22,15,5],
    trim:[82,65,42],    specular:[118,95,65],   metallic:0.22, roughness:0.78 },

  // ── Tier 3: Metal ───────────────────────────────────────────────
  { id:"chainmail",     name:"Chainmail",      tier:3, index:6,
    base:[138,140,148], mid:[108,110,118], shadow:[75,77,85],
    trim:[192,198,208], specular:[232,238,248], metallic:0.72, roughness:0.42 },
  { id:"iron",          name:"Iron",           tier:3, index:7,
    base:[118,122,132], mid:[88,92,102],   shadow:[58,62,72],
    trim:[168,175,188], specular:[212,220,232], metallic:0.82, roughness:0.28 },

  // ── Tier 4: Plate ───────────────────────────────────────────────
  { id:"steel",         name:"Steel Plate",    tier:4, index:8,
    base:[162,172,188], mid:[128,138,155], shadow:[88,98,115],
    trim:[218,228,242], specular:[248,252,255], metallic:1.00, roughness:0.08 },
];

// ── 4 Shape Variants ──────────────────────────────────────────────
// Each slot has 4 shapes that significantly differ in silhouette.

export const ARMOR_SHAPES = [
  { index:0, id:"simple",     name:"Simple",     description:"Minimal coverage, clean lines"              },
  { index:1, id:"reinforced", name:"Reinforced",  description:"Structural elements, rivets/straps visible" },
  { index:2, id:"ornate",     name:"Ornate",      description:"Decorative details, complex trim"           },
  { index:3, id:"elite",      name:"Elite",       description:"Legendary design, unique silhouette"        },
] as const;

export type ArmorShapeIndex = 0 | 1 | 2 | 3;

// ── ArmorVariant — generated for every slot ───────────────────────

export interface ArmorVariant {
  id: string;           // full variant id: "helm_05_cloth_blue_simple"
  num: number;          // 1..36
  slot: ArmorSlot;
  material: ArmorMaterial;
  materialIndex: number; // 0-8
  shapeIndex: ArmorShapeIndex;
  shapeName: string;
  tier: number;
  displayName: string;
}

export function buildArmorVariants(slot: ArmorSlot): ArmorVariant[] {
  const variants: ArmorVariant[] = [];
  for (const mat of ARMOR_MATERIALS) {
    for (const shape of ARMOR_SHAPES) {
      const num = mat.index * 4 + shape.index + 1;
      variants.push({
        id:            `${slot}_${String(num).padStart(2,"0")}_${mat.id}_${shape.id}`,
        num,
        slot,
        material:      mat,
        materialIndex: mat.index,
        shapeIndex:    shape.index as ArmorShapeIndex,
        shapeName:     shape.id,
        tier:          mat.tier,
        displayName:   `${mat.name} ${shape.name}`,
      });
    }
  }
  return variants;
}

export const ALL_ARMOR_VARIANTS: Record<ArmorSlot, ArmorVariant[]> =
  Object.fromEntries(ARMOR_SLOTS.map(s => [s, buildArmorVariants(s)])) as
  Record<ArmorSlot, ArmorVariant[]>;

// ── Utility: parse variantId back to components (deterministic decode) ──

export function parseArmorVariantId(id: string): {
  slot: ArmorSlot; num: number; materialId: string; shapeId: string;
} | null {
  // format: {slot}_{nn}_{materialId}_{shapeId}
  // materialId can contain underscores (cloth_white, leather_dark, etc.)
  const parts = id.split("_");
  if (parts.length < 4) return null;
  const slot = parts[0] as ArmorSlot;
  const num  = parseInt(parts[1], 10);
  const shapeId = parts[parts.length - 1];
  const materialId = parts.slice(2, -1).join("_");
  return { slot, num, materialId, shapeId };
}
