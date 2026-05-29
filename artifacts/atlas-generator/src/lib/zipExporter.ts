/**
 * Creates the export ZIP bundle.
 *
 * areloria-atlas/
 *   atlas.png         — packed sprite sheet
 *   atlas.json        — PixiJS TexturePacker Hash manifest
 *   animations.json   — FPS / loop / frame count + animation principles
 *   layers.json       — armor slot system + full PixiJS 8 assembly code
 *   README.md         — integration guide
 */
import JSZip from "jszip";
import type { PackResult } from "./atlasPacker";
import type { AtlasManifest, AnimationsDef, LayersDef } from "./manifestBuilder";

export interface ExportBundle {
  manifest: AtlasManifest;
  animations: AnimationsDef;
  layers: LayersDef;
  packResult: PackResult;
  exportMode?: "character" | "parts";
}

export async function exportAtlasZip(bundle: ExportBundle): Promise<Blob> {
  const zip    = new JSZip();
  const folder = zip.folder("areloria-atlas")!;

  // atlas.png — convert canvas to PNG blob
  folder.file("atlas.png",      await canvasToPngBlob(bundle.packResult.canvas));
  folder.file("atlas.json",     JSON.stringify(bundle.manifest,   null, 2));
  folder.file("animations.json",JSON.stringify(bundle.animations, null, 2));
  folder.file("layers.json",    JSON.stringify(bundle.layers,     null, 2));
  folder.file("README.md",      buildReadme(bundle));

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob() returned null — canvas may be too large or tainted"));
      }, "image/png");
    } catch (e) {
      reject(e);
    }
  });
}

function buildReadme(bundle: ExportBundle): string {
  const m    = bundle.manifest.meta;
  const cats = Object.keys(bundle.layers.categories);
  const pa   = bundle.layers.pixijsAssembly;

  return `# Areloria Character Atlas v${m.version}

Generated: ${m.generated}
Mode: ${bundle.exportMode === "character" ? "Single Character Export" : "Parts Atlas Export"}

## Overview

Modular character sprite pack for Areloria MMORPG (RuneScape-style classless system).  
Characters have **no weapons in base sprites** — weapons are a separate overlay layer.  
Equipment is swapped at runtime by replacing textures on the relevant slot sprite.

## Animation Design Principles

These sprites implement professional 2D animation principles:

| Principle        | Applied to                                         |
|------------------|----------------------------------------------------|
| Squash & Stretch | Attack (0.88→1.08 scaleY), Hurt (0.88 squash)     |
| Anticipation     | Attack wind-up (pull back + squat before strike)   |
| Follow-through   | Attack rebound frame after peak extension          |
| Weight           | Walk body dips at mid-stance, rises at contact     |
| Secondary motion | Aura particles animate independently of body       |

## Isometric Perspective

8 directions use proper 2.5D isometric perspective:
- **scaleX** compression: south=1.0, SE/SW=0.80, E/W=0.35 (profile)
- **scaleY** compression: north-facing sprites are **12% shorter** (overhead view shows top of head)
- **yShift**: north = 17px higher on screen (further from camera = higher isometric plane)

## Atlas Stats

| Property      | Value                         |
|---------------|-------------------------------|
| Atlas size    | ${m.size.w} × ${m.size.h} px |
| Sprite size   | ${m.spriteSize} × ${m.spriteSize} px |
| Total frames  | ${m.totalFrames}              |
| Unique parts  | ${m.totalParts}               |
| Pivot/anchor  | (0.5, 0.9) — feet-center      |

## Files

| File               | Description                                           |
|--------------------|-------------------------------------------------------|
| \`atlas.png\`        | Sprite sheet (RGBA8888, transparent background)       |
| \`atlas.json\`       | PixiJS TexturePacker Hash manifest + pivot points     |
| \`animations.json\`  | FPS, loop, frame count + animation principle notes    |
| \`layers.json\`      | Armor slot definitions + full PixiJS 8 assembly code  |

## Part Categories

${cats.map(c => {
  const cat = bundle.layers.categories[c];
  return `- **${c}**: ${cat.count} variants — \`${cat.ids.slice(0, 3).join(", ")}${cat.count > 3 ? " …" : ""}\``;
}).join("\n")}

## Animations

${Object.entries(bundle.animations.definitions).map(([name, def]) =>
  `- **${name}** (${def.frames}f @ ${def.fps}fps${def.loop ? ", loops" : ""}): ${def.principle}`
).join("\n")}

## Directions

8-directional with isometric Y-perspective:

\`south\` ← \`southeast\` ← \`east\` ← \`northeast\` ← \`north\` ← \`northwest\` ← \`west\` ← \`southwest\`

## Frame Naming

\`\`\`
{configId}_{direction}_{animation}_{frameIndex}

Examples:
  char_south_idle_0
  char_north_walk_4
  char_west_attack_2
\`\`\`

## PixiJS 8 Quick Start

\`\`\`javascript
${pa.containerSetup}
\`\`\`

## Equipment Swap at Runtime

\`\`\`javascript
${pa.equipSwap}
\`\`\`

## Direction Switch

\`\`\`javascript
${pa.directionSwitch}
\`\`\`

## Armor Slot Z-Order

Render order (back → front):
\`\`\`
${bundle.layers.renderOrder.join(" → ")}
\`\`\`

Each slot is a separate \`PIXI.AnimatedSprite\` at the same position.  
Set \`container.sortableChildren = true\` and assign \`sprite.zIndex\` per slot.

## License

Free to use in the Areloria MMORPG project. All sprites procedurally generated.
`;
}
