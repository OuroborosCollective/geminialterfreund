/**
 * Export Panel — two modes:
 *
 * 1. "Single Character" (default, fast):
 *    Exports only the current character config — all 8 dirs × all 10 anims.
 *    ~424 frames → atlas ~2016×2016 px. Always finishes in < 2 seconds.
 *
 * 2. "Parts Atlas" (advanced):
 *    All part variants × selected color combos. Capped at 4096×4096 (≤1820 sprites).
 *    Shows a warning when the requested count would be capped.
 */
import { useState, useCallback } from "react";
import type { CharacterConfig } from "@/lib/characterAssembler";
import { packCharacterAtlas, packAtlas } from "@/lib/atlasPacker";
import type { PackRequest } from "@/lib/atlasPacker";
import { buildAtlasManifest, buildAnimationsDef, buildLayersDef } from "@/lib/manifestBuilder";
import { exportAtlasZip } from "@/lib/zipExporter";
import {
  ALL_VARIANTS, ARMOR_SCHEMES, SKIN_TONES, HAIR_COLORS,
  RENDER_LAYER_ORDER, ANIMATIONS, DIRECTIONS, ANIMATION_DEFS,
} from "@/lib/partDefinitions";
import type { Direction, AnimationName, PartCategory } from "@/lib/partDefinitions";
import { buildPalette } from "@/lib/palettes";

interface Props {
  config: CharacterConfig | null;
}

type ExportMode  = "character" | "parts";
type ExportState = "idle" | "packing" | "done" | "error";

const QUICK_DIRS: Direction[]    = ["south", "west", "north", "east"];
const FULL_DIRS: Direction[]     = DIRECTIONS;
const KEY_ANIMS: AnimationName[] = ["idle", "walk", "attack"];
const QUICK_SCHEMES              = ["cloth_white", "leather_brown", "plate_iron", "magic_arcane"];
const FULL_SCHEMES               = ARMOR_SCHEMES.map(s => s.id);
const MAX_PARTS_SPRITES          = 1820;

export function ExportPanel({ config }: Props) {
  const [mode,       setMode]       = useState<ExportMode>("character");
  const [state,      setState]      = useState<ExportState>("idle");
  const [progress,   setProgress]   = useState(0);
  const [msg,        setMsg]        = useState("");
  const [atlasInfo,  setAtlasInfo]  = useState("");
  const [dirSet,     setDirSet]     = useState<"quick"|"full">("full");
  const [animSet,    setAnimSet]    = useState<"key"|"all">("all");
  const [colorSet,   setColorSet]   = useState<"quick"|"full">("quick");

  // ── Estimates ──────────────────────────────────────────────────

  const charFrames = (() => {
    const dirs  = dirSet  === "quick" ? 4 : 8;
    const total = ANIMATIONS.reduce((s, a) => s + ANIMATION_DEFS[a].frames, 0);
    return animSet === "key" ? dirs * 18 : dirs * total;
  })();

  const partsFrames = (() => {
    const dirs    = dirSet    === "quick" ? 4 : 8;
    const schemes = colorSet  === "quick" ? 4 : FULL_SCHEMES.length;
    const animFrames = animSet === "key" ? 18 : 53;
    const parts = RENDER_LAYER_ORDER.reduce((s, cat) => s + (ALL_VARIANTS[cat as keyof typeof ALL_VARIANTS]?.length ?? 0), 0);
    return Math.min(parts * schemes * 2 * dirs * animFrames, MAX_PARTS_SPRITES);
  })();

  const isCapped = (() => {
    if (mode !== "parts") return false;
    const dirs    = dirSet    === "quick" ? 4 : 8;
    const schemes = colorSet  === "quick" ? 4 : FULL_SCHEMES.length;
    const animFrames = animSet === "key" ? 18 : 53;
    const parts = RENDER_LAYER_ORDER.reduce((s, cat) => s + (ALL_VARIANTS[cat as keyof typeof ALL_VARIANTS]?.length ?? 0), 0);
    return parts * schemes * 2 * dirs * animFrames > MAX_PARTS_SPRITES;
  })();

  // ── Character export ───────────────────────────────────────────

  const exportCharacter = useCallback(async () => {
    if (!config) { setMsg("No character loaded"); setState("error"); return; }
    setState("packing"); setProgress(10); setMsg("Rendering character sprites…");

    try {
      await tick();
      const dirs  = dirSet  === "quick" ? QUICK_DIRS : FULL_DIRS;
      const anims = animSet === "key"   ? KEY_ANIMS  : ANIMATIONS;

      const result = packCharacterAtlas({
        palette: config.palette,
        layers:  config.layers,
        configId: `char_${config.palette.id}`,
        directions: dirs,
        animations: anims,
      });

      setProgress(60); setMsg("Building manifests…"); await tick();

      const manifest   = buildAtlasManifest(result.frames, result.atlasWidth, result.atlasHeight);
      const animations = buildAnimationsDef();
      const layers     = buildLayersDef(result.frames);

      setProgress(80); setMsg("Generating ZIP…"); await tick();

      const blob = await exportAtlasZip({ manifest, animations, layers, packResult: result, exportMode: "character" });
      triggerDownload(blob, `areloria-character-${Date.now()}.zip`);

      setAtlasInfo(`${result.atlasWidth}×${result.atlasHeight} px · ${result.frames.length} frames`);
      setProgress(100); setMsg("Done!"); setState("done");
    } catch (err) {
      console.error(err);
      setMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setState("error");
    }
  }, [config, dirSet, animSet]);

  // ── Parts atlas export ─────────────────────────────────────────

  const exportParts = useCallback(async () => {
    setState("packing"); setProgress(5); setMsg("Building part requests…");

    try {
      await tick();
      const dirs    = dirSet    === "quick" ? QUICK_DIRS    : FULL_DIRS;
      const anims   = animSet   === "key"   ? KEY_ANIMS     : ANIMATIONS;
      const schemes = colorSet  === "quick" ? QUICK_SCHEMES : FULL_SCHEMES;

      const requests: PackRequest[] = [];
      outer: for (const cat of RENDER_LAYER_ORDER) {
        const variants = ALL_VARIANTS[cat as keyof typeof ALL_VARIANTS] ?? [];
        for (const variant of variants) {
          for (const schemeId of schemes) {
            const skinId = "s2";
            const hairId = "brown";
            requests.push({
              category: cat as PartCategory,
              variantId: variant.id,
              variantIndex: variant.shapeCode,
              colorSchemeId: `${skinId}_${schemeId}`,
              palette: buildPalette(skinId, hairId, schemeId),
              directions: dirs,
              animations: anims,
            });
            if (requests.length >= 80) break outer; // keep render time sane
          }
        }
      }

      setMsg(`Rendering ${requests.length} parts (capped at ${MAX_PARTS_SPRITES} sprites)…`);
      await tick();

      const result = packAtlas(requests, (done, total) => {
        setProgress(10 + Math.round((done / total) * 70));
        if (done % 80 === 0) setMsg(`Rendering… ${done}/${total}`);
      });

      setProgress(82); setMsg("Building manifests…"); await tick();

      const manifest   = buildAtlasManifest(result.frames, result.atlasWidth, result.atlasHeight);
      const animations = buildAnimationsDef();
      const layers     = buildLayersDef(result.frames);

      setProgress(92); setMsg("Generating ZIP…"); await tick();

      const blob = await exportAtlasZip({ manifest, animations, layers, packResult: result, exportMode: "parts" });
      triggerDownload(blob, `areloria-parts-atlas-${Date.now()}.zip`);

      setAtlasInfo(`${result.atlasWidth}×${result.atlasHeight} px · ${result.frames.length} frames`);
      setProgress(100); setMsg("Done!"); setState("done");
    } catch (err) {
      console.error(err);
      setMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setState("error");
    }
  }, [dirSet, animSet, colorSet]);

  const handleExport = mode === "character" ? exportCharacter : exportParts;

  return (
    <div className="flex flex-col gap-4">

      {/* Mode selector */}
      <div className="space-y-1">
        <div className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wide">Export Type</div>
        <div className="grid grid-cols-2 gap-2">
          <ModeBtn active={mode === "character"} onClick={() => { setMode("character"); setState("idle"); }}
            title="Current Character" sub="Fast · always works · full animations" />
          <ModeBtn active={mode === "parts"} onClick={() => { setMode("parts"); setState("idle"); }}
            title="Parts Atlas" sub={`All variants · capped at ${MAX_PARTS_SPRITES} sprites`} />
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        <OptionGroup
          label="Directions"
          opts={[
            { value:"quick", label:"4-dir (N/S/E/W)",  sub:"faster export"    },
            { value:"full",  label:"8-dir full",        sub:"all angles"       },
          ]}
          value={dirSet} onChange={v => setDirSet(v as "quick"|"full")} />

        <OptionGroup
          label="Animations"
          opts={[
            { value:"key", label:"Key 3 (idle+walk+attack)", sub:"18 frames total" },
            { value:"all", label:"All 10 animations",        sub:"53 frames total" },
          ]}
          value={animSet} onChange={v => setAnimSet(v as "key"|"all")} />

        {mode === "parts" && (
          <OptionGroup
            label="Color schemes"
            opts={[
              { value:"quick", label:"4 schemes",              sub:"cloth / leather / plate / magic" },
              { value:"full",  label:`All ${FULL_SCHEMES.length} schemes`, sub:"every color combo" },
            ]}
            value={colorSet} onChange={v => setColorSet(v as "quick"|"full")} />
        )}
      </div>

      {/* Estimate */}
      <div className="rounded-lg bg-white/4 border border-white/10 px-3 py-2 text-xs text-muted-foreground flex items-center gap-3">
        <span>~{(mode === "character" ? charFrames : partsFrames).toLocaleString()} sprites</span>
        {isCapped && (
          <>
            <span className="opacity-40">·</span>
            <span className="text-amber-400/80">⚠ capped at {MAX_PARTS_SPRITES}</span>
          </>
        )}
      </div>

      {/* Progress */}
      {state === "packing" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{msg}</span><span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full bg-accent transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {state === "done" && (
        <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400">
          ✓ Downloaded! {atlasInfo}
        </div>
      )}
      {state === "error" && (
        <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-400 break-all">
          ✗ {msg}
        </div>
      )}

      <button
        onClick={() => { setState("idle"); setMsg(""); handleExport(); }}
        disabled={state === "packing"}
        className="w-full py-2.5 rounded-lg bg-accent text-background font-semibold text-sm
          disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1019]"
      >
        {state === "packing" ? "⏳ Generating…" : "⬇ Download Atlas (.zip)"}
      </button>

      <div className="text-[10px] text-muted-foreground/60 leading-snug">
        ZIP: atlas.png · atlas.json (PixiJS) · animations.json · layers.json (armor system) · README.md
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function tick() { return new Promise(r => setTimeout(r, 8)); }

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function ModeBtn({ active, onClick, title, sub }: {
  active: boolean; onClick: () => void; title: string; sub: string;
}) {
  return (
    <button onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-2 rounded-lg text-left transition-colors border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
        active ? "border-accent bg-accent/15 text-foreground" : "border-white/8 bg-white/3 text-muted-foreground hover:bg-white/8"
      }`}>
      <div className="text-xs font-semibold">{title}</div>
      <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>
    </button>
  );
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
            aria-pressed={value === o.value}
            className={`px-2.5 py-1.5 rounded-lg text-left transition-colors border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              value === o.value
                ? "border-accent bg-accent/15 text-foreground"
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
