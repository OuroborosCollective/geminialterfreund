import { useState, useEffect, useRef, useCallback } from "react";
import { assembleCharacter } from "@/lib/characterAssembler";
import type { CharacterConfig } from "@/lib/characterAssembler";
import { ANIMATION_DEFS, ANIMATIONS, DIRECTIONS, ARMOR_SCHEMES, SKIN_TONES, HAIR_COLORS } from "@/lib/partDefinitions";
import type { AnimationName, Direction } from "@/lib/partDefinitions";
import { buildPalette } from "@/lib/palettes";
import { CharacterPreview, DirectionGrid, AtlasStripPreview } from "@/components/CharacterPreview";
import { LayerPanel } from "@/components/LayerPanel";
import { AnimationControls } from "@/components/AnimationControls";
import { ExportPanel } from "@/components/ExportPanel";
import { ArmorExportPanel } from "@/components/ArmorExportPanel";
import { AtlasPreviewWindow } from "@/components/AtlasPreviewWindow";
import { SeedControls } from "@/components/SeedControls";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { preloadAllSprites } from "@/lib/spriteLibrary";
import { ALL_VARIANTS } from "@/lib/partDefinitions";

type Tab = "builder" | "directions" | "strip" | "atlas" | "export" | "armor";

export function GeneratorPage() {
  const [seed, setSeed]     = useState(0x1a2b3c4d);
  const [config, setConfig] = useState<CharacterConfig | null>(null);
  const [tab, setTab]       = useState<Tab>("builder");
  const [anim, setAnim]     = useState<AnimationName>("idle");
  const [dir, setDir]       = useState<Direction>("south");
  const [frame, setFrame]   = useState(0);
  const [playing, setPlaying] = useState(true);

  const [skinId,   setSkinId]   = useState("s2");
  const [hairId,   setHairId]   = useState("brown");
  const [schemeId, setSchemeId] = useState("leather_brown");

  const [spritesReady, setSpritesReady] = useState(false);
  const rafRef      = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    preloadAllSprites().then(() => setSpritesReady(true));
  }, []);

  useEffect(() => {
    const base = assembleCharacter(seed);
    const pal  = buildPalette(skinId, hairId, schemeId);
    setConfig({ ...base, palette: { ...pal, aura: base.palette.aura } });
    setFrame(0);
  }, [seed, skinId, hairId, schemeId]);

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    const def = ANIMATION_DEFS[anim];
    const msPerFrame = 1000 / def.fps;
    function tick(now: number) {
      if (now - lastTimeRef.current >= msPerFrame) {
        lastTimeRef.current = now;
        setFrame(f => (f + 1) % def.frames);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, anim]);

  const handleAnimChange = (a: AnimationName) => { setAnim(a); setFrame(0); };
  const handleRandom     = useCallback(() => setSeed(Math.floor(Math.random() * 0xffffffff)), []);

  const totalVariants = Object.values(ALL_VARIANTS).reduce((s, v) => s + v.length, 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: "builder",    label: "🎭 Builder"    },
    { id: "directions", label: "🧭 Directions" },
    { id: "strip",      label: "🎞 Strip"      },
    { id: "atlas",      label: "🗺 Atlas"      },
    { id: "export",     label: "📦 Export"     },
    { id: "armor",      label: "🛡 Armor"      },
  ];

  return (
    <div className="min-h-screen bg-[#0f1019] text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-white/8 px-4 py-3 flex items-center gap-3">
        <div className="text-base font-bold text-foreground/90 tracking-tight">
          ⚔ Areloria Character Atlas
        </div>
        <div className="text-xs text-muted-foreground/60 hidden sm:block">
          classless · RuneScape-style · modular parts
        </div>
        <div className="ml-auto">
          <SeedControls seed={seed} onSeedChange={setSeed} />
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <aside className="w-64 border-r border-white/8 flex flex-col overflow-hidden bg-[#13151f]">
          <div className="p-3 border-b border-white/8">
            <div className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2">
              Skin & Color
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground/50">Skin tone</label>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {SKIN_TONES.map(s => (
                    <Tooltip key={s.id}>
                      <TooltipTrigger asChild>
                        <button
                          aria-label={`Skin tone: ${s.name}`}
                          aria-pressed={skinId === s.id}
                          onClick={() => setSkinId(s.id)}
                          className={`w-5 h-5 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#13151f] ${skinId === s.id ? "border-accent scale-125" : "border-transparent"}`}
                          style={{ background: s.hex }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px] py-1 px-2">
                        {s.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/50">Hair color</label>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {HAIR_COLORS.map(h => (
                    <Tooltip key={h.id}>
                      <TooltipTrigger asChild>
                        <button
                          aria-label={`Hair color: ${h.name}`}
                          aria-pressed={hairId === h.id}
                          onClick={() => setHairId(h.id)}
                          className={`w-5 h-5 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#13151f] ${hairId === h.id ? "border-accent scale-125" : "border-transparent"}`}
                          style={{ background: h.hex }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px] py-1 px-2">
                        {h.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="equipment-color" className="text-[10px] text-muted-foreground/50">Equipment color</label>
                <select
                  id="equipment-color"
                  value={schemeId}
                  onChange={e => setSchemeId(e.target.value)}
                  className="mt-0.5 w-full bg-white/5 border border-white/10 rounded text-xs px-1.5 py-1 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  {ARMOR_SCHEMES.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <LayerPanel config={config} onChange={setConfig} />
          </div>
        </aside>

        {/* ── Center: Preview ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/8 bg-[#10121c] overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap focus-visible:outline-none focus-visible:bg-white/5 ${
                  tab === t.id
                    ? t.id === "armor"
                      ? "border-violet-500 text-foreground"
                      : "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">

            {tab === "builder" && (
              <div className="flex flex-col items-center gap-4">
                <CharacterPreview config={config} anim={anim} dir={dir} frame={frame} scale={4} spritesReady={spritesReady} />
                <AnimationControls
                  anim={anim} dir={dir} playing={playing} frame={frame}
                  onAnimChange={handleAnimChange}
                  onDirChange={d => { setDir(d); setFrame(0); }}
                  onTogglePlay={() => setPlaying(p => !p)}
                />
                {config && (
                  <div className="text-[10px] text-muted-foreground/50 font-mono text-center">
                    seed: 0x{seed.toString(16).toUpperCase().padStart(8, "0")} · {config.tags.schemeId} · {config.tags.skinId} · {config.tags.hairColorId}
                  </div>
                )}
                <button
                  onClick={handleRandom}
                  className="px-4 py-2 rounded-lg bg-white/8 hover:bg-white/14 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  🎲 Random Character
                </button>
              </div>
            )}

            {tab === "directions" && (
              <div className="max-w-lg mx-auto space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground">All 8 Directions</h2>
                <DirectionGrid config={config} anim={anim} frame={frame} />
                <AnimationControls
                  anim={anim} dir={dir} playing={playing} frame={frame}
                  onAnimChange={handleAnimChange}
                  onDirChange={setDir}
                  onTogglePlay={() => setPlaying(p => !p)}
                />
              </div>
            )}

            {tab === "strip" && (
              <div className="max-w-xl mx-auto space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground">Animation Strip</h2>
                {ANIMATIONS.map(a => (
                  <div key={a} className="space-y-1">
                    <div className="text-xs text-muted-foreground font-mono">{a}</div>
                    <AtlasStripPreview config={config} anim={a} dir={dir} />
                  </div>
                ))}
              </div>
            )}

            {tab === "atlas" && (
              <div className="max-w-2xl mx-auto">
                <AtlasPreviewWindow config={config} />
              </div>
            )}

            {tab === "export" && (
              <div className="max-w-md mx-auto">
                <div className="rounded-xl border border-white/10 bg-[#13151f] p-4 space-y-1 mb-4">
                  <div className="text-sm font-bold">Character Atlas Pack</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {totalVariants} part variants across 11 categories ·
                    10 animations · 8 directions · Deterministic names
                  </div>
                  <div className="text-xs text-muted-foreground/60 pt-1">
                    atlas.png · atlas.json · animations.json · layers.json · README.md
                  </div>
                </div>
                <ExportPanel config={config} />
              </div>
            )}

            {tab === "armor" && (
              <div className="max-w-md mx-auto">
                <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-4 space-y-1 mb-4">
                  <div className="text-sm font-bold text-violet-200">🛡 Armor Parts Atlas</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Separate transparent armor overlay sprites — 8 slots ×
                    <span className="text-violet-300 font-mono"> 36 variants each</span> (288 total).
                    Stack over character sprites in PixiJS for runtime equipment swapping.
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
                    {[
                      ["T1 Cloth",     "cloth_white · blue · red · dark"],
                      ["T2 Leather",   "leather_brown · dark"],
                      ["T3 Metal",     "chainmail · iron"],
                      ["T4 Plate",     "steel (4 shapes each)"],
                    ].map(([tier, desc]) => (
                      <div key={tier} className="text-[10px] text-muted-foreground/60">
                        <span className="text-muted-foreground/80">{tier}:</span> {desc}
                      </div>
                    ))}
                  </div>
                </div>
                <ArmorExportPanel />
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
