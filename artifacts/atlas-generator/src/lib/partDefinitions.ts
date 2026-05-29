export type PartCategory =
  | "head"
  | "hair"
  | "torso"
  | "legs"
  | "boots"
  | "gloves"
  | "shoulders"
  | "cape"
  | "facial"
  | "accessory"
  | "aura";

export type Direction = "south" | "southwest" | "west" | "northwest" | "north" | "northeast" | "east" | "southeast";
export type AnimationName = "idle" | "walk" | "run" | "attack" | "cast" | "hurt" | "death" | "interact" | "emote" | "sit";

export const DIRECTIONS: Direction[] = [
  "south", "southwest", "west", "northwest",
  "north", "northeast", "east", "southeast",
];

export const ANIMATION_DEFS: Record<AnimationName, { frames: number; fps: number; loop: boolean }> = {
  idle:     { frames: 4,  fps: 4,  loop: true  },
  walk:     { frames: 8,  fps: 10, loop: true  },
  run:      { frames: 8,  fps: 14, loop: true  },
  attack:   { frames: 6,  fps: 12, loop: false },
  cast:     { frames: 6,  fps: 8,  loop: false },
  hurt:     { frames: 3,  fps: 8,  loop: false },
  death:    { frames: 6,  fps: 8,  loop: false },
  interact: { frames: 4,  fps: 6,  loop: false },
  emote:    { frames: 4,  fps: 6,  loop: false },
  sit:      { frames: 4,  fps: 4,  loop: true  },
};

export const ANIMATIONS = Object.keys(ANIMATION_DEFS) as AnimationName[];

export const SPRITE_SIZE = 96;

/** Render order: back-to-front */
export const RENDER_LAYER_ORDER: PartCategory[] = [
  "aura", "cape", "legs", "boots", "torso", "gloves", "shoulders", "head", "hair", "facial", "accessory",
];

// ── Color Palette Library (classless — equipment-based) ──────────

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  metal: string;
  trim: string;
}

export const HAIR_COLORS: Array<{ id: string; name: string; hex: string }> = [
  { id: "black",    name: "Black",    hex: "#1a1208" },
  { id: "darkbrown",name: "Dark Brown", hex: "#3b1f0a" },
  { id: "brown",    name: "Brown",    hex: "#6b3a1f" },
  { id: "auburn",   name: "Auburn",   hex: "#8b3a1a" },
  { id: "red",      name: "Red",      hex: "#b02010" },
  { id: "blonde",   name: "Blonde",   hex: "#c89030" },
  { id: "platinum", name: "Platinum", hex: "#ddd8c0" },
  { id: "white",    name: "White",    hex: "#ece8e0" },
  { id: "grey",     name: "Grey",     hex: "#888070" },
  { id: "blue",     name: "Blue",     hex: "#2040a0" },
  { id: "purple",   name: "Purple",   hex: "#6030a0" },
  { id: "green",    name: "Green",    hex: "#207040" },
];

export const SKIN_TONES: Array<{ id: string; name: string; hex: string; shadow: string }> = [
  { id: "s1", name: "Pale",      hex: "#f5dcc8", shadow: "#d4a88a" },
  { id: "s2", name: "Fair",      hex: "#e8c89a", shadow: "#c49060" },
  { id: "s3", name: "Medium",    hex: "#c89060", shadow: "#9e6835" },
  { id: "s4", name: "Olive",     hex: "#a87848", shadow: "#7a5228" },
  { id: "s5", name: "Tan",       hex: "#906040", shadow: "#6a4020" },
  { id: "s6", name: "Brown",     hex: "#704828", shadow: "#4e2e10" },
  { id: "s7", name: "Dark",      hex: "#503018", shadow: "#321808" },
  { id: "s8", name: "Ashen",     hex: "#b0b0a8", shadow: "#808070" },
];

export const ARMOR_SCHEMES: ColorScheme[] = [
  { id: "cloth_white",   name: "White Cloth",    primary: "#dddbc8", secondary: "#c0be98", metal: "#aaa090", trim: "#fffff0" },
  { id: "cloth_grey",    name: "Grey Cloth",     primary: "#909090", secondary: "#707070", metal: "#888888", trim: "#b0b0b0" },
  { id: "cloth_brown",   name: "Brown Cloth",    primary: "#8b6040", secondary: "#6a4820", metal: "#a08060", trim: "#c09870" },
  { id: "cloth_green",   name: "Green Cloth",    primary: "#4a7040", secondary: "#306028", metal: "#608050", trim: "#80a860" },
  { id: "cloth_red",     name: "Red Cloth",      primary: "#9a3020", secondary: "#781808", metal: "#b04030", trim: "#d06050" },
  { id: "cloth_blue",    name: "Blue Cloth",     primary: "#304880", secondary: "#203060", metal: "#405898", trim: "#6080c0" },
  { id: "cloth_purple",  name: "Purple Cloth",   primary: "#603080", secondary: "#482060", metal: "#7840a0", trim: "#9060c0" },
  { id: "cloth_black",   name: "Black Cloth",    primary: "#282828", secondary: "#181818", metal: "#403838", trim: "#504040" },
  { id: "leather_brown", name: "Brown Leather",  primary: "#7a5030", secondary: "#583818", metal: "#a09060", trim: "#c0a870" },
  { id: "leather_black", name: "Black Leather",  primary: "#302020", secondary: "#201010", metal: "#504040", trim: "#706060" },
  { id: "leather_red",   name: "Red Leather",    primary: "#6a2818", secondary: "#501000", metal: "#a04030", trim: "#c06050" },
  { id: "leather_green", name: "Forest Leather", primary: "#3a5828", secondary: "#284018", metal: "#607850", trim: "#809860" },
  { id: "chain_iron",    name: "Iron Chain",     primary: "#8a8888", secondary: "#686666", metal: "#b0acaa", trim: "#d0cecc" },
  { id: "chain_gold",    name: "Gilded Chain",   primary: "#c09838", secondary: "#a07818", metal: "#e0c060", trim: "#f8e880" },
  { id: "plate_iron",    name: "Iron Plate",     primary: "#787878", secondary: "#585858", metal: "#a0a0a0", trim: "#c8c8c8" },
  { id: "plate_steel",   name: "Steel Plate",    primary: "#909898", secondary: "#707880", metal: "#b8c0c8", trim: "#dce4f0" },
  { id: "plate_dark",    name: "Dark Steel",     primary: "#484858", secondary: "#303040", metal: "#686880", trim: "#9090b0" },
  { id: "plate_gold",    name: "Gold Plate",     primary: "#c09030", secondary: "#a07010", metal: "#e8c050", trim: "#fff090" },
  { id: "plate_crimson", name: "Crimson Plate",  primary: "#8a1818", secondary: "#680000", metal: "#b03030", trim: "#e05050" },
  { id: "plate_royal",   name: "Royal Blue",     primary: "#283880", secondary: "#182060", metal: "#4060b0", trim: "#6890e0" },
  { id: "magic_arcane",  name: "Arcane Robe",    primary: "#3a2060", secondary: "#280e48", metal: "#6040a0", trim: "#a060f0" },
  { id: "magic_fire",    name: "Fire Robe",      primary: "#802010", secondary: "#601000", metal: "#d04820", trim: "#ff8040" },
  { id: "magic_ice",     name: "Ice Robe",       primary: "#2040a0", secondary: "#102880", metal: "#5080d0", trim: "#90c0ff" },
  { id: "magic_nature",  name: "Nature Robe",    primary: "#285030", secondary: "#183820", metal: "#508050", trim: "#80d060" },
];

// ── Part Variant Definitions ──────────────────────────────────────

export interface PartVariant {
  id: string;
  name: string;
  category: PartCategory;
  style: string;       // short style descriptor
  shapeCode: number;   // 0-N, selects which shape to draw
  tags: string[];
  tier: number;        // 1=common, 5=legendary
}

function makeVariants(
  category: PartCategory,
  defs: Array<{ style: string; tags: string[]; tier?: number }>
): PartVariant[] {
  return defs.map((d, i) => ({
    id: `${category}_${String(i + 1).padStart(2, "0")}`,
    name: `${d.style.charAt(0).toUpperCase() + d.style.slice(1).replace(/_/g, " ")} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
    category,
    style: d.style,
    shapeCode: i,
    tags: d.tags,
    tier: d.tier ?? 1,
  }));
}

export const HEAD_VARIANTS = makeVariants("head", [
  { style: "round",     tags: ["human"],          tier: 1 },
  { style: "square",    tags: ["human", "strong"], tier: 1 },
  { style: "narrow",    tags: ["human", "slim"],   tier: 1 },
  { style: "wide",      tags: ["human", "broad"],  tier: 1 },
  { style: "elf",       tags: ["elf"],              tier: 2 },
  { style: "elf_noble", tags: ["elf"],              tier: 3 },
  { style: "stocky",    tags: ["dwarf"],            tier: 2 },
  { style: "fierce",    tags: ["human", "warrior"], tier: 2 },
  { style: "aged",      tags: ["human", "elder"],   tier: 1 },
  { style: "ashen",     tags: ["undead"],           tier: 3 },
]);

export const HAIR_VARIANTS = makeVariants("hair", [
  { style: "short_neat",    tags: ["short"],           tier: 1 },
  { style: "short_messy",   tags: ["short"],           tier: 1 },
  { style: "medium_swept",  tags: ["medium"],          tier: 1 },
  { style: "medium_wavy",   tags: ["medium"],          tier: 1 },
  { style: "long_straight", tags: ["long"],            tier: 1 },
  { style: "long_wavy",     tags: ["long"],            tier: 1 },
  { style: "ponytail",      tags: ["long", "tied"],    tier: 1 },
  { style: "topknot",       tags: ["tied"],            tier: 2 },
  { style: "braids",        tags: ["long", "braided"], tier: 2 },
  { style: "mohawk",        tags: ["short", "edgy"],   tier: 2 },
  { style: "wild_long",     tags: ["long", "wild"],    tier: 2 },
  { style: "bald",          tags: ["none"],            tier: 1 },
]);

export const TORSO_VARIANTS = makeVariants("torso", [
  { style: "cloth_simple",   tags: ["cloth", "light"],  tier: 1 },
  { style: "cloth_tunic",    tags: ["cloth"],           tier: 1 },
  { style: "cloth_robe",     tags: ["cloth", "mage"],   tier: 1 },
  { style: "leather_vest",   tags: ["leather", "light"],tier: 1 },
  { style: "leather_armor",  tags: ["leather"],         tier: 2 },
  { style: "leather_studded",tags: ["leather", "studs"],tier: 2 },
  { style: "chain_mail",     tags: ["chain"],           tier: 2 },
  { style: "chain_coif",     tags: ["chain", "hood"],   tier: 2 },
  { style: "plate_light",    tags: ["plate"],           tier: 3 },
  { style: "plate_medium",   tags: ["plate"],           tier: 3 },
  { style: "plate_heavy",    tags: ["plate", "heavy"],  tier: 4 },
  { style: "plate_royal",    tags: ["plate", "royal"],  tier: 5 },
]);

export const LEGS_VARIANTS = makeVariants("legs", [
  { style: "cloth_simple",   tags: ["cloth"],           tier: 1 },
  { style: "cloth_baggy",    tags: ["cloth", "wide"],   tier: 1 },
  { style: "cloth_skirt",    tags: ["cloth", "skirt"],  tier: 1 },
  { style: "leather_pants",  tags: ["leather"],         tier: 1 },
  { style: "leather_chaps",  tags: ["leather", "chaps"],tier: 2 },
  { style: "chain_legs",     tags: ["chain"],           tier: 2 },
  { style: "plate_legs",     tags: ["plate"],           tier: 3 },
  { style: "plate_royal",    tags: ["plate", "royal"],  tier: 4 },
]);

export const BOOTS_VARIANTS = makeVariants("boots", [
  { style: "sandals",        tags: ["light", "open"],   tier: 1 },
  { style: "cloth_shoes",    tags: ["cloth"],           tier: 1 },
  { style: "leather_boots",  tags: ["leather"],         tier: 1 },
  { style: "ranger_boots",   tags: ["leather", "agile"],tier: 2 },
  { style: "chain_boots",    tags: ["chain"],           tier: 2 },
  { style: "plate_sabaton",  tags: ["plate"],           tier: 3 },
  { style: "plate_royal",    tags: ["plate", "royal"],  tier: 4 },
  { style: "magic_slippers", tags: ["cloth", "arcane"], tier: 2 },
]);

export const SHOULDERS_VARIANTS = makeVariants("shoulders", [
  { style: "none",            tags: ["none"],            tier: 1 },
  { style: "cloth_pads",      tags: ["cloth", "light"],  tier: 1 },
  { style: "leather_pads",    tags: ["leather"],         tier: 1 },
  { style: "chain_pads",      tags: ["chain"],           tier: 2 },
  { style: "plate_pauldrons", tags: ["plate"],           tier: 3 },
  { style: "spiked",          tags: ["plate", "spikes"], tier: 3 },
  { style: "feathered",       tags: ["light", "exotic"], tier: 3 },
  { style: "royal_epaulettes",tags: ["royal"],           tier: 5 },
]);

export const CAPE_VARIANTS = makeVariants("cape", [
  { style: "none",           tags: ["none"],             tier: 1 },
  { style: "short_cape",     tags: ["light"],            tier: 1 },
  { style: "medium_cape",    tags: ["medium"],           tier: 2 },
  { style: "long_cape",      tags: ["long"],             tier: 2 },
  { style: "hooded_cloak",   tags: ["long", "hood"],     tier: 3 },
  { style: "tattered_cape",  tags: ["worn"],             tier: 1 },
  { style: "royal_cape",     tags: ["royal"],            tier: 4 },
  { style: "mage_cloak",     tags: ["arcane", "long"],   tier: 3 },
]);

export const GLOVES_VARIANTS = makeVariants("gloves", [
  { style: "none",            tags: ["none"],             tier: 1 },
  { style: "cloth_wraps",     tags: ["cloth"],            tier: 1 },
  { style: "leather_gloves",  tags: ["leather"],          tier: 1 },
  { style: "chain_gauntlets", tags: ["chain"],            tier: 2 },
  { style: "plate_gauntlets", tags: ["plate"],            tier: 3 },
  { style: "arcane_bracers",  tags: ["arcane"],           tier: 3 },
]);

export const FACIAL_VARIANTS = makeVariants("facial", [
  { style: "none",            tags: ["none"],             tier: 1 },
  { style: "short_beard",     tags: ["beard"],            tier: 1 },
  { style: "full_beard",      tags: ["beard"],            tier: 1 },
  { style: "scar",            tags: ["scar"],             tier: 1 },
  { style: "war_paint",       tags: ["paint"],            tier: 2 },
  { style: "tribal_tattoo",   tags: ["tattoo"],           tier: 2 },
  { style: "mask_half",       tags: ["mask"],             tier: 3 },
  { style: "mask_full",       tags: ["mask"],             tier: 3 },
]);

export const ACCESSORY_VARIANTS = makeVariants("accessory", [
  { style: "none",            tags: ["none"],             tier: 1 },
  { style: "headband",        tags: ["cloth"],            tier: 1 },
  { style: "leather_hat",     tags: ["leather"],          tier: 1 },
  { style: "flat_cap",        tags: ["cloth"],            tier: 1 },
  { style: "hood_down",       tags: ["cloth", "hood"],    tier: 1 },
  { style: "hood_up",         tags: ["cloth", "hood"],    tier: 2 },
  { style: "open_helm",       tags: ["plate"],            tier: 2 },
  { style: "closed_helm",     tags: ["plate"],            tier: 3 },
  { style: "crown",           tags: ["royal"],            tier: 4 },
  { style: "horned_helm",     tags: ["plate", "horned"],  tier: 4 },
]);

export const AURA_VARIANTS = makeVariants("aura", [
  { style: "none",     tags: ["none"],    tier: 1 },
  { style: "holy",     tags: ["divine"],  tier: 3 },
  { style: "dark",     tags: ["shadow"],  tier: 3 },
  { style: "fire",     tags: ["fire"],    tier: 3 },
  { style: "ice",      tags: ["ice"],     tier: 3 },
  { style: "arcane",   tags: ["arcane"],  tier: 4 },
]);

export const ALL_VARIANTS = {
  head:      HEAD_VARIANTS,
  hair:      HAIR_VARIANTS,
  torso:     TORSO_VARIANTS,
  legs:      LEGS_VARIANTS,
  boots:     BOOTS_VARIANTS,
  shoulders: SHOULDERS_VARIANTS,
  cape:      CAPE_VARIANTS,
  gloves:    GLOVES_VARIANTS,
  facial:    FACIAL_VARIANTS,
  accessory: ACCESSORY_VARIANTS,
  aura:      AURA_VARIANTS,
};
