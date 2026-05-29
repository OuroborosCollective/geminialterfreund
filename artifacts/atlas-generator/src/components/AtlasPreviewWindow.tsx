import { useEffect, useRef, useState } from "react";
import type { CharacterConfig } from "@/lib/characterAssembler";
import { packAtlas } from "@/lib/atlasPacker";
import type { PackRequest } from "@/lib/atlasPacker";
import { SPRITE_SIZE, RENDER_LAYER_ORDER, ALL_VARIANTS, ARMOR_SCHEMES, SKIN_TONES, HAIR_COLORS } from "@/lib/partDefinitions";
import type { Direction, AnimationName, PartCategory } from "@/lib/partDefinitions";
import { buildPalette } from "@/lib/palettes";

const PREVIEW_DIRS: Direction[]     = ["south", "west", "north", "east"];
const PREVIEW_ANIMS: AnimationName[] = ["idle", "walk", "attack"];
const PREVIEW_SCHEMES               = ["leather_brown", "plate_iron", "magic_arcane"];

export function AtlasPreviewWindow({ config }: { config: CharacterConfig | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({ w: 0, h: 0, frames: 0 });

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    setLoading(true);

    setTimeout(() => {
      if (cancelled) return;

      const requests: PackRequest[] = [];

      for (const cat of RENDER_LAYER_ORDER) {
        const variants = ALL_VARIANTS[cat as keyof typeof ALL_VARIANTS] ?? [];
        // Sample: first 3 variants × 2 color schemes
        for (const variant of variants.slice(0, 3)) {
          for (const schemeId of PREVIEW_SCHEMES.slice(0, 2)) {
            const palette = buildPalette("s2", "brown", schemeId);
            requests.push({
              category: cat as PartCategory,
              variantId: variant.id,
              variantIndex: variant.shapeCode,
              colorSchemeId: schemeId,
              palette,
              directions: PREVIEW_DIRS,
              animations: PREVIEW_ANIMS,
            });
          }
        }
      }

      const result = packAtlas(requests);

      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width  = result.atlasWidth;
      canvas.height = result.atlasHeight;
      const ctx = canvas.getContext("2d")!;

      // Checkerboard
      const ts = 8;
      for (let ty = 0; ty < Math.ceil(result.atlasHeight / ts); ty++) {
        for (let tx = 0; tx < Math.ceil(result.atlasWidth / ts); tx++) {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? "#181924" : "#1d1f32";
          ctx.fillRect(tx * ts, ty * ts, ts, ts);
        }
      }

      ctx.drawImage(result.canvas, 0, 0);

      // Grid overlay
      ctx.strokeStyle = "rgba(255,200,80,0.12)";
      ctx.lineWidth = 0.5;
      const S = SPRITE_SIZE;
      const cols = Math.ceil(result.atlasWidth / S);
      const rows = Math.ceil(result.atlasHeight / S);
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath(); ctx.moveTo(c * S, 0); ctx.lineTo(c * S, result.atlasHeight); ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * S); ctx.lineTo(result.atlasWidth, r * S); ctx.stroke();
      }

      setInfo({ w: result.atlasWidth, h: result.atlasHeight, frames: result.frames.length });
      setLoading(false);
    }, 20);

    return () => { cancelled = true; };
  }, [config]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Atlas Preview (sample)</span>
        {info.frames > 0 && (
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            {info.w}×{info.h} · {info.frames} frames
          </span>
        )}
      </div>
      <div className="relative overflow-auto max-h-64 rounded-lg border border-white/10">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs text-accent animate-pulse">
            Rendering preview…
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block"
          style={{ imageRendering: "pixelated", minWidth: "100%" }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/50">
        Sample: 3 variants × 2 colors × 4 directions × idle/walk/attack. Full atlas generated on export.
      </p>
    </div>
  );
}
