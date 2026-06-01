import { ANIMATIONS, ANIMATION_DEFS, DIRECTIONS } from "@/lib/partDefinitions";
import type { AnimationName, Direction } from "@/lib/partDefinitions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ANIM_ICONS: Record<AnimationName, string> = {
  idle:     "⏸",
  walk:     "🚶",
  run:      "🏃",
  attack:   "⚔",
  cast:     "✨",
  hurt:     "💢",
  death:    "💀",
  interact: "🤝",
  emote:    "💬",
  sit:      "🪑",
};

const DIR_ICONS: Record<Direction, string> = {
  south:     "↓ S",
  southwest: "↙ SW",
  west:      "← W",
  northwest: "↖ NW",
  north:     "↑ N",
  northeast: "↗ NE",
  east:      "→ E",
  southeast: "↘ SE",
};

const DIR_LABELS: Record<Direction, string> = {
  south:     "South",
  southwest: "Southwest",
  west:      "West",
  northwest: "Northwest",
  north:     "North",
  northeast: "Northeast",
  east:      "East",
  southeast: "Southeast",
};

interface Props {
  anim: AnimationName;
  dir: Direction;
  frame: number;
  playing: boolean;
  onAnimChange: (a: AnimationName) => void;
  onDirChange: (d: Direction) => void;
  onTogglePlay: () => void;
  onFrameChange?: (f: number) => void;
}

export function AnimationControls({
  anim, dir, frame, playing,
  onAnimChange, onDirChange, onTogglePlay, onFrameChange,
}: Props) {
  const def = ANIMATION_DEFS[anim];

  return (
    <div className="space-y-3">
      {/* Animation selector */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Animation</div>
        <div className="flex flex-wrap gap-1">
          {ANIMATIONS.map(a => (
            <button
              key={a}
              onClick={() => onAnimChange(a)}
              aria-pressed={a === anim}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                a === anim
                  ? "bg-primary/20 border border-primary/60 text-primary font-semibold"
                  : "bg-muted/30 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              } focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`}
            >
              <span aria-hidden="true">{ANIM_ICONS[a]}</span>
              <span className="capitalize">{a}</span>
              <span className="text-[10px] opacity-60">{ANIMATION_DEFS[a].frames}f</span>
            </button>
          ))}
        </div>
      </div>

      {/* Direction selector */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direction</div>
        <div className="grid grid-cols-4 gap-1">
          {DIRECTIONS.map(d => (
            <Tooltip key={d}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDirChange(d)}
                  aria-pressed={d === dir}
                  aria-label={DIR_LABELS[d]}
                  className={`px-2 py-1 rounded text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    d === dir
                      ? "bg-accent/20 border border-accent/60 text-accent font-semibold"
                      : "bg-muted/30 border border-border/40 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span aria-hidden="true">{DIR_ICONS[d]}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{DIR_LABELS[d]}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Playback controls */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Playback — Frame {frame + 1}/{def.frames} · {def.fps} fps
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            aria-label={playing ? "Pause animation" : "Play animation"}
            className="px-3 py-1.5 rounded bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <input
            type="range"
            min={0}
            max={def.frames - 1}
            value={frame}
            onChange={e => onFrameChange?.(Number(e.target.value))}
            className="flex-1 accent-amber-400"
          />
        </div>
        <div className="text-[10px] text-muted-foreground">
          {anim}_{dir} · {def.loop ? "loop" : "once"}
        </div>
      </div>
    </div>
  );
}
