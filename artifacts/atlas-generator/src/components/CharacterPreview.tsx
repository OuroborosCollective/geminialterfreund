import { useEffect, useRef, useCallback } from "react";
import { drawCharacterFrame } from "@/lib/spriteRenderer";
import type { CharacterConfig } from "@/lib/characterAssembler";
import type { AnimationName, Direction } from "@/lib/partDefinitions";
import { ANIMATION_DEFS, SPRITE_SIZE, DIRECTIONS } from "@/lib/partDefinitions";

interface Props {
  config: CharacterConfig | null;
  anim: AnimationName;
  dir: Direction;
  frame: number;
  scale?: number;
  spritesReady?: boolean;
}

const BG_DARK  = "#181924";
const BG_LIGHT = "#1d1f32";

function checkerboard(ctx: CanvasRenderingContext2D, w: number, h: number, ts = 16) {
  for (let ty = 0; ty < Math.ceil(h / ts); ty++) {
    for (let tx = 0; tx < Math.ceil(w / ts); tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? BG_DARK : BG_LIGHT;
      ctx.fillRect(tx * ts, ty * ts, ts, ts);
    }
  }
}

export function CharacterPreview({ config, anim, dir, frame, scale = 4, spritesReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const displaySize = SPRITE_SIZE * scale;

    checkerboard(ctx, displaySize, displaySize);

    if (!config) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.font = `${scale * 3}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("No character", displaySize / 2, displaySize / 2);
      return;
    }

    const off = document.createElement("canvas");
    off.width = SPRITE_SIZE; off.height = SPRITE_SIZE;
    const offCtx = off.getContext("2d")!;
    drawCharacterFrame(offCtx, 0, 0, dir, anim, frame, config.palette, config.layers);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, displaySize, displaySize);
  }, [config, anim, dir, frame, scale, spritesReady]);

  useEffect(() => { draw(); }, [draw]);

  const displaySize = SPRITE_SIZE * scale;
  return (
    <canvas
      ref={canvasRef}
      width={displaySize}
      height={displaySize}
      className="rounded-xl border border-white/10 shadow-2xl"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export function DirectionGrid({ config, anim, frame }: {
  config: CharacterConfig | null;
  anim: AnimationName;
  frame: number;
}) {
  const canvasRefs = useRef<Map<Direction, HTMLCanvasElement>>(new Map());

  const drawAll = useCallback(() => {
    if (!config) return;
    DIRECTIONS.forEach(dir => {
      const canvas = canvasRefs.current.get(dir);
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const size = SPRITE_SIZE * 2;
      checkerboard(ctx, size, size, 8);
      const off = document.createElement("canvas");
      off.width = SPRITE_SIZE; off.height = SPRITE_SIZE;
      drawCharacterFrame(off.getContext("2d")!, 0, 0, dir, anim, frame, config.palette, config.layers);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, size, size);
    });
  }, [config, anim, frame]);

  useEffect(() => { drawAll(); }, [drawAll]);

  const cellSize = SPRITE_SIZE * 2;
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {DIRECTIONS.map(dir => (
        <div key={dir} className="flex flex-col items-center gap-0.5">
          <canvas
            ref={el => { if (el) canvasRefs.current.set(dir, el); }}
            width={cellSize} height={cellSize}
            className="rounded border border-white/10 shadow"
            style={{ imageRendering: "pixelated" }}
          />
          <span className="text-[9px] text-muted-foreground capitalize font-mono">{dir}</span>
        </div>
      ))}
    </div>
  );
}

export function AtlasStripPreview({ config, anim, dir }: {
  config: CharacterConfig | null;
  anim: AnimationName;
  dir: Direction;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config) return;
    const ctx = canvas.getContext("2d")!;
    const def = ANIMATION_DEFS[anim];
    const size = SPRITE_SIZE;
    const scale = 2;
    canvas.width = def.frames * size * scale;
    canvas.height = size * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let f = 0; f < def.frames; f++) {
      const off = document.createElement("canvas");
      off.width = size; off.height = size;
      drawCharacterFrame(off.getContext("2d")!, 0, 0, dir, anim, f, config.palette, config.layers);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, f * size * scale, 0, size * scale, size * scale);
      ctx.strokeStyle = "rgba(255,200,60,0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(f * size * scale, 0, size * scale, size * scale);
      ctx.fillStyle = "rgba(255,200,60,0.6)";
      ctx.font = "8px monospace";
      ctx.fillText(`${f}`, f * size * scale + 3, 11);
    }
  }, [config, anim, dir]);

  if (!config) return null;
  return (
    <div className="overflow-x-auto rounded border border-white/10">
      <canvas ref={canvasRef} style={{ imageRendering: "pixelated", display: "block" }} />
    </div>
  );
}
