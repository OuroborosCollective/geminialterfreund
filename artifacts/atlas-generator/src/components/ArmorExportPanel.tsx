/**
 * Armor Atlas Export Panel
 *
 * Exports the independent armor pieces atlas:
 *  - 8 slots (helm, chest, legs, boots, gloves, cape, bracers, shoulders)
 *  - 9 materials × 4 shapes = 36 variants per slot (288 total)
 *  - Selectable slots, direction set, animation set
 *  - Capped at 4096×4096 px (same safety as character export)
 *
 * Output ZIP:
 *   armor_atlas.png      — transparent sprite sheet (RGBA8888)
 *   armor_atlas.json     — PixiJS TexturePacker Hash manifest
 *   armor_layers.json    — slot system + PixiJS layering code
 *   README.md            — integration guide
 */
import { useState, useCallback } from "react";
import JSZip from "jszip";
import {
  packArmorAtlas, buildArmorManifest, buildArmorLayersDef,
  buildArmorRequests,
} from "@/lib/armorPacker";
import { ARMOR_SLOTS, ARMOR_SLOT_INFO, ARMOR_MATERIALS, ALL_ARMOR_VARIANTS } from "@/lib/armorDefinitions";
import type { ArmorSlot } from "@/lib/armorDefinitions";
import { ANIMATIONS, ANIMATION_DEFS } from "@/lib/partDefinitions";
import type { Direction, AnimationName } from "@/lib/partDefinitions";

const QUICK_DIRS: Direction[] = ["south", "west", "north", "east"];
const FULL_DIRS: Direction[]  = ["south","southwest","west","northwest","north","northeast","east","southeast"];
const KEY_ANIMS: AnimationName[] = ["idle", "walk", "attack"];
const MAX_SPRITES = 1820;

type ExportState = "idle" | "packing" | "done" | "error";

export function ArmorExportPanel() {
  const [state,      setState]      = useState<ExportState>("idle");
  const [progress,   setProgress]   = useState(0);
  const [msg,        setMsg]        = useState("");
  const [info,       setInfo]       = useState("");
  const [dirSet,     setDirSet]     = useState<"quick"|"full">("full");
  const [animSet,    setAnimSet]    = useState<"key"|"all">("key");
  const [tiers,      setTiers]      = useState<Set<number>>(new Set([1,2,3,4]));
  const [selSlots,   setSelSlots]   = useState<Set<ArmorSlot>>(new Set(ARMOR_SLOTS));

  const toggleTier  = (t: number) => setTiers(prev => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });
  const toggleSlot  = (sl: ArmorSlot) => setSelSlots(prev => { const s = new Set(prev); s.has(sl) ? s.delete(sl) : s.add(sl); return s; });
  const allSlots    = () => setSelSlots(new Set(ARMOR_SLOTS));
  const clearSlots  = () => setSelSlots(new Set());

  const estimate = (() => {
    const dirs  = dirSet  === "quick" ? 4 : 8;
    const afr   = animSet === "key"   ? 18 : ANIMATIONS.reduce((s, a) => s + ANIMATION_DEFS[a].frames, 0);
    const slots = [...selSlots];
    const total = slots.reduce((sum, sl) => {
      const vs = ALL_ARMOR_VARIANTS[sl].filter(v => tiers.has(v.tier));
      return sum + vs.length;
    }, 0);
    return Math.min(total * dirs * afr, MAX_SPRITES);
  })();

  const isCapped = (() => {
    const dirs  = dirSet  === "quick" ? 4 : 8;
    const afr   = animSet === "key"   ? 18 : ANIMATIONS.reduce((s, a) => s + ANIMATION_DEFS[a].frames, 0);
    const total = [...selSlots].reduce((sum, sl) => {
      const vs = ALL_ARMOR_VARIANTS[sl].filter(v => tiers.has(v.tier));
      return sum + vs.length;
    }, 0);
    return total * dirs * afr > MAX_SPRITES;
  })();

  const handleExport = useCallback(async () => {
    setState("packing"); setProgress(5); setMsg("Building armor requests…");
    try {
      await tick();

      const dirs  = dirSet  === "quick" ? QUICK_DIRS : FULL_DIRS;
      const anims = animSet === "key"   ? KEY_ANIMS  : ANIMATIONS;
      const slots = [...selSlots];

      // Build requests filtered by tier + slot selection
      const allRequests = buildArmorRequests(slots, dirs, anims);
      const requests    = allRequests.filter(r => tiers.has(r.tier));

      if (requests.length === 0) {
        setMsg("No variants selected — choose at least one tier and slot.");
        setState("error"); return;
      }

      setMsg(`Rendering ${requests.length} variants across ${slots.length} slots…`);
      await tick();

      const result = packArmorAtlas(requests, (done, total) => {
        setProgress(8 + Math.round((done / total) * 72));
        if (done % 40 === 0) setMsg(`Rendering… ${done}/${total}`);
      });

      setProgress(82); setMsg("Building manifests…"); await tick();

      const manifest = buildArmorManifest(result.frames, result.atlasWidth, result.atlasHeight);
      const layers   = buildArmorLayersDef(result.frames);

      setProgress(90); setMsg("Generating ZIP…"); await tick();

      const zip    = new JSZip();
      const folder = zip.folder("areloria-armor-atlas")!;

      folder.file("armor_atlas.png",  await canvasToBlob(result.canvas));
      folder.file("armor_atlas.json", JSON.stringify(manifest, null, 2));
      folder.file("armor_layers.json",JSON.stringify(layers,   null, 2));
      folder.file("README.md",        buildReadme(manifest, result));

      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      triggerDownload(blob, `areloria-armor-atlas-${Date.now()}.zip`);

      setInfo(`${result.atlasWidth}×${result.atlasHeight} px · ${result.frames.length} frames · ${new Set(result.frames.map(f => f.variantId)).size} variants`);
      setProgress(100); setMsg("Done!"); setState("done");
    } catch (err) {
      console.error(err);
      setMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setState("error");
    }
  }, [dirSet, animSet, tiers, selSlots]);

  return (
    <div className="flex flex-col gap-4">

      {/* Header info */}
      <div className="rounded-lg border border-white/10 bg-white/3 px-3 py-2.5 text-xs space-y-1">
        <div className="font-semibold text-foreground/85">Armor Parts Atlas</div>
        <div className="text-muted-foreground leading-snug">
          8 slots · 9 materials × 4 shapes = <span className="text-foreground/70 font-mono">36 variants per slot</span>
          {" "}(288 total). Transparent overlays — layer over character body sprites in PixiJS.
        </div>
        <div className="text-muted-foreground/60">
          Materials: cloth × 4 · leather × 2 · chainmail · iron · steel plate
        </div>
      </div>

      {/* Slot selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide">Slots ({selSlots.size}/8)</div>
          <div className="flex gap-2 text-[10px]">
            <button onClick={allSlots}   className="text-accent/80 hover:text-accent">All</button>
            <button onClick={clearSlots} className="text-muted-foreground/60 hover:text-muted-foreground">None</button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {ARMOR_SLOTS.map(sl => (
            <button
              key={sl}
              onClick={() => toggleSlot(sl)}
              className={`px-2 py-1.5 rounded text-[10px] font-medium transition-colors border text-left ${
                selSlots.has(sl)
                  ? "border-accent/60 bg-accent/12 text-foreground"
                  : "border-white/8 bg-white/3 text-muted-foreground"
              }`}
            >
              <div>{ARMOR_SLOT_INFO[sl].displayName}</div>
              <div className="text-[9px] opacity-50">{ARMOR_SLOT_INFO[sl].zIndex}z</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tier filter */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide">Material Tiers</div>
        <div className="flex gap-1.5">
          {[
            { tier:1, label:"T1 Cloth",   color:"bg-amber-600/20  border-amber-500/40  text-amber-300"  },
            { tier:2, label:"T2 Leather",  color:"bg-orange-700/20 border-orange-600/40 text-orange-300" },
            { tier:3, label:"T3 Metal",    color:"bg-slate-500/20  border-slate-400/40  text-slate-300"  },
            { tier:4, label:"T4 Plate",    color:"bg-cyan-700/20   border-cyan-500/40   text-cyan-300"   },
          ].map(({ tier, label, color }) => (
            <button
              key={tier}
              onClick={() => toggleTier(tier)}
              className={`flex-1 px-1.5 py-1 rounded text-[10px] font-medium transition-all border ${
                tiers.has(tier) ? color : "border-white/8 bg-white/3 text-muted-foreground/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Direction + Animation */}
      <div className="grid grid-cols-2 gap-3">
        <OptionGroup
          label="Directions"
          opts={[
            { value:"quick", label:"4-dir",   sub:"N/S/E/W" },
            { value:"full",  label:"8-dir",   sub:"all angles" },
          ]}
          value={dirSet}
          onChange={v => setDirSet(v as "quick"|"full")}
        />
        <OptionGroup
          label="Animations"
          opts={[
            { value:"key", label:"Key 3", sub:"idle+walk+attack" },
            { value:"all", label:"All 10", sub:"53 frames" },
          ]}
          value={animSet}
          onChange={v => setAnimSet(v as "key"|"all")}
        />
      </div>

      {/* Estimate */}
      <div className="rounded-lg bg-white/4 border border-white/10 px-3 py-2 text-xs text-muted-foreground flex items-center gap-3">
        <span>~{estimate.toLocaleString()} sprites</span>
        {isCapped && (
          <>
            <span className="opacity-40">·</span>
            <span className="text-amber-400/80">⚠ capped at {MAX_SPRITES}</span>
          </>
        )}
        <span className="opacity-40">·</span>
        <span>transparent bg</span>
      </div>

      {/* Progress */}
      {state === "packing" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{msg}</span><span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full bg-violet-500 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {state === "done" && (
        <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400">
          ✓ Downloaded! {info}
        </div>
      )}
      {state === "error" && (
        <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-400 break-all">
          ✗ {msg}
        </div>
      )}

      <button
        onClick={() => { setState("idle"); setMsg(""); handleExport(); }}
        disabled={state === "packing" || selSlots.size === 0}
        className="w-full py-2.5 rounded-lg bg-violet-600 text-white font-semibold text-sm
          disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-500 transition-colors"
      >
        {state === "packing" ? "⏳ Rendering Armor…" : "⬇ Download Armor Atlas (.zip)"}
      </button>

      <div className="text-[10px] text-muted-foreground/60 leading-snug">
        ZIP: armor_atlas.png (transparent) · armor_atlas.json (PixiJS) · armor_layers.json · README.md
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function tick() { return new Promise(r => setTimeout(r, 8)); }

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob returned null")), "image/png");
    } catch (e) { reject(e); }
  });
}

function buildReadme(manifest: ReturnType<typeof buildArmorManifest>, result: { atlasWidth: number; atlasHeight: number; frames: { variantId: string; slot: string }[] }): string {
  const slots = [...new Set(result.frames.map(f => f.slot))];
  const variants = new Set(result.frames.map(f => f.variantId)).size;

  return `# Areloria Armor Atlas v1.0.0

Generated: ${(manifest.meta as { generated: string }).generated}

## Overview

Independent armor piece sprites for Areloria MMORPG.
These are **transparent overlays** — stack on top of character body sprites in PixiJS.
Every armor piece has a transparent background with ONLY the armor pixels rendered.

## System

| Property         | Value                               |
|------------------|-------------------------------------|
| Slots            | helm, chest, legs, boots, gloves, cape, bracers, shoulders |
| Materials        | 9 (cloth×4, leather×2, chainmail, iron, steel plate)       |
| Shapes per mat   | 4 (simple, reinforced, ornate, elite)                       |
| **Variants/slot**| **36** (9 × 4)                      |
| Total variants   | ${variants}                         |
| Sprite size      | 96 × 96 px (transparent background) |
| Atlas size       | ${result.atlasWidth} × ${result.atlasHeight} px |
| Anchor/pivot     | (0.5, 0.9) — feet center            |

## Material Tiers

| Tier | Materials                                           |
|------|-----------------------------------------------------|
| T1   | cloth_white, cloth_blue, cloth_red, cloth_dark      |
| T2   | leather_brown, leather_dark                         |
| T3   | chainmail, iron                                     |
| T4   | steel (plate)                                       |

## Design Shapes (4 per material)

| Shape | Style      | Description                                        |
|-------|------------|----------------------------------------------------|
| 0     | simple     | Minimal coverage, clean lines                      |
| 1     | reinforced | Structural elements, rivets/straps visible         |
| 2     | ornate     | Decorative details, complex trim                   |
| 3     | elite      | Legendary design, unique silhouette per tier       |

## Frame Naming (deterministic)

\`\`\`
variantId  = {slot}_{nn:02d}_{materialId}_{shapeName}
frameKey   = {variantId}_{dir}_{anim}_{frame}

Decode nn: nn = (materialIndex × 4) + shapeIndex + 1   (1..36 per slot)

Examples:
  helm_01_cloth_white_simple                       (helm variant 1)
  helm_36_steel_elite                              (helm variant 36 = steel elite)
  chest_09_leather_brown_simple_south_walk_3       (full frame key)
  boots_33_steel_simple_north_idle_0
\`\`\`

## PixiJS Layering

\`\`\`javascript
// 1. Load both atlases
const charSheet  = await PIXI.Assets.load('atlas.json');        // character body
const armorSheet = await PIXI.Assets.load('armor_atlas.json'); // armor overlays

// 2. Build character container
const container = new PIXI.Container();
container.sortableChildren = true;

// 3. Add armor piece over character (same anchor, higher zIndex)
function equipArmor(variantId, dir = 'south', anim = 'idle') {
  const animKey  = variantId + '_' + dir + '_' + anim;
  const textures = armorSheet.animations[animKey];
  if (!textures) return;

  const sprite = new PIXI.AnimatedSprite(textures);
  sprite.anchor.set(0.5, 0.9);   // same as character
  sprite.zIndex  = ARMOR_Z_INDEX[variantId.split('_')[0]]; // slot → zIndex
  container.addChild(sprite);

  // Sync to character body frame
  sprite.onFrameChange = (frame) => {
    // all armor sprites sync here
  };
}

// Z-Index map
const ARMOR_Z_INDEX = {
  cape:9, legs:11, boots:12, chest:13, gloves:14, bracers:15, shoulders:16, helm:17
};
\`\`\`

## Slots Exported

${slots.map(s => `- **${s}**: ${[...new Set(result.frames.filter(f => f.slot === s).map(f => f.variantId))].length} variants`).join("\n")}

## License

Free to use in the Areloria MMORPG project. All sprites procedurally generated.
`;
}

interface OptionDef { value: string; label: string; sub: string }
function OptionGroup({ label, opts, value, onChange }: {
  label: string; opts: OptionDef[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wide">{label}</div>
      <div className="flex flex-col gap-1">
        {opts.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`px-2.5 py-1.5 rounded-lg text-left transition-colors border ${
              value === o.value
                ? "border-violet-500/60 bg-violet-500/15 text-foreground"
                : "border-white/8 bg-white/3 text-muted-foreground hover:bg-white/8"
            }`}>
            <div className="text-xs font-medium">{o.label}</div>
            <div className="text-[10px] opacity-60">{o.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
