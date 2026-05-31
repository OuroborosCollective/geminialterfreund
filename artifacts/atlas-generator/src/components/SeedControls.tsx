import { useState, useRef, useCallback } from "react";
import { seedFromString } from "@/lib/prng";

interface Props {
  seed: number;
  onSeedChange: (seed: number) => void;
}

export function SeedControls({ seed, onSeedChange }: Props) {
  const [inputVal, setInputVal] = useState(String(seed));
  const [isString, setIsString] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRandomize = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 0xffffffff);
    setInputVal(String(newSeed));
    setIsString(false);
    onSeedChange(newSeed);
  }, [onSeedChange]);

  const handleInputChange = useCallback((val: string) => {
    setInputVal(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && String(num) === val) {
      setIsString(false);
      onSeedChange(num >>> 0);
    } else if (val.length > 0) {
      setIsString(true);
      onSeedChange(seedFromString(val));
    }
  }, [onSeedChange]);

  const PRESETS = [
    { label: "#1",  value: 0x1a2b3c4d },
    { label: "#2",  value: 0x7f8e9fab },
    { label: "#3",  value: 0x2d4e6f80 },
    { label: "#4",  value: 0xdeadbeef },
    { label: "#5",  value: 0xc0ffee01 },
    { label: "#6",  value: 0xaabbccdd },
    { label: "#7",  value: 0x12345678 },
    { label: "#8",  value: 0xfeedface },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seed</div>

      {/* Seed input row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={inputVal}
            onChange={e => handleInputChange(e.target.value)}
            placeholder="Enter number or string…"
            className="w-full bg-muted/40 border border-border/60 rounded px-3 py-2 text-sm font-mono text-foreground/90 focus:outline-none focus:border-primary/60 focus:bg-muted/60 transition-colors"
          />
          {isString && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-accent/60 font-mono">
              → {seed}
            </div>
          )}
        </div>
        <button
          onClick={handleRandomize}
          title="Generate random seed"
          aria-label="Generate random seed"
          className="px-3 py-2 rounded bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-lg leading-none transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <span aria-hidden="true">🎲</span>
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => {
              setInputVal(String(p.value >>> 0));
              setIsString(false);
              onSeedChange(p.value >>> 0);
            }}
            aria-label={`Seed preset ${p.label}`}
            className="px-2 py-1 rounded text-xs bg-muted/40 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="text-[10px] text-muted-foreground/60 font-mono">
        Seed <span className="text-accent/70">{seed >>> 0}</span> · Deterministic · Same seed = same character
      </div>
    </div>
  );
}
