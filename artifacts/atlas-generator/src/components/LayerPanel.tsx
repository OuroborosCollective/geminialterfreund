import { useState } from "react";
import type { CharacterConfig } from "@/lib/characterAssembler";
import { swapLayer } from "@/lib/characterAssembler";
import { ALL_VARIANTS, RENDER_LAYER_ORDER } from "@/lib/partDefinitions";
import type { PartCategory } from "@/lib/partDefinitions";

const CAT_ICONS: Record<PartCategory, string> = {
  head: "👤", hair: "💈", torso: "🧥", legs: "👖",
  shoulders: "🛡", cape: "🧣", gloves: "🤲", boots: "👢",
  facial: "😶", accessory: "💍", aura: "✨",
};
const CAT_LABELS: Record<PartCategory, string> = {
  head: "Head", hair: "Hair", torso: "Torso", legs: "Legs",
  shoulders: "Shoulders", cape: "Cape", gloves: "Gloves", boots: "Boots",
  facial: "Facial", accessory: "Accessory", aura: "Aura",
};

interface Props {
  config: CharacterConfig | null;
  onChange: (next: CharacterConfig) => void;
}

export function LayerPanel({ config, onChange }: Props) {
  const [activeCategory, setActiveCategory] = useState<PartCategory>("torso");

  if (!config) return (
    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
      Generate a character first
    </div>
  );

  const variants = ALL_VARIANTS[activeCategory as keyof typeof ALL_VARIANTS] ?? [];
  const currentLayer = config.layers.find(l => l.category === activeCategory);
  const currentVariantIdx = currentLayer?.variantIndex ?? 0;

  const handleSwap = (variantIndex: number) => {
    onChange(swapLayer(config, activeCategory, variantIndex));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-white/10">
        {RENDER_LAYER_ORDER.filter(c => c !== "aura").map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-accent/90 text-background"
                : "bg-white/5 hover:bg-white/12 text-muted-foreground"
            } focus-visible:ring-2 focus-visible:ring-accent focus:outline-none`}
          >
            <span aria-hidden="true">{CAT_ICONS[cat]}</span> {CAT_LABELS[cat]}
          </button>
        ))}
        <button
          onClick={() => setActiveCategory("aura")}
          aria-pressed={activeCategory === "aura"}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            activeCategory === "aura"
              ? "bg-accent/90 text-background"
              : "bg-white/5 hover:bg-white/12 text-muted-foreground"
          } focus-visible:ring-2 focus-visible:ring-accent focus:outline-none`}
        >
          <span aria-hidden="true">✨</span> Aura
        </button>
      </div>

      {/* Variant grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => handleSwap(variant.shapeCode)}
              className={`p-2 rounded-lg text-left transition-all border ${
                currentVariantIdx === variant.shapeCode
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-white/8 bg-white/3 hover:bg-white/8 text-muted-foreground"
              }`}
            >
              <div className="text-xs font-medium leading-snug capitalize">
                {variant.style.replace(/_/g, " ")}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {variant.tags.slice(0, 2).map(t => (
                  <span key={t} className="text-[9px] bg-white/8 px-1 rounded">{t}</span>
                ))}
                <span className="ml-auto text-[9px] text-amber-400/70">{"★".repeat(variant.tier)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
