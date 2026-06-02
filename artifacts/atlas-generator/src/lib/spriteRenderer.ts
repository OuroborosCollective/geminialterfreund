/**
 * Hybrid sprite renderer — Professional 2D/2.5D animation principles
 *
 * Best-practice techniques applied:
 *  - Squash & Stretch (body compresses on impact, extends on reach)
 *  - Anticipation (wind-up before attacks, lean before run)
 *  - Follow-through (overshoot on rebound)
 *  - Weight (body dips lower at mid-stance, higher at contact)
 *  - Isometric Y-perspective (north-facing chars are shorter + higher on screen)
 *  - Secondary motion (aura particles continue independently)
 *
 * Layer stack (bottom → top):
 *  1. Drop shadow (perspective ellipse)
 *  2. Aura glow (procedural, secondary motion)
 *  3. Cape (behind body — only fallback)
 *  4. AI character sprite OR canvas fallback
 *  5. Shoulders / hair / facial / accessory (fallback only)
 */
import type { Palette, RGB } from "./palettes";
import { rgbToStyle, lighten, darken } from "./palettes";
import type { Direction, AnimationName, PartCategory } from "./partDefinitions";
import { SPRITE_SIZE } from "./partDefinitions";
import { getSpriteFor, schemeToSpriteType } from "./spriteLibrary";
import type { SpriteType } from "./spriteLibrary";

export interface LayerSpec { category: PartCategory; variantIndex: number }

// ─── Direction transform (isometric perspective) ─────────────────
// scaleY < 1 for back-facing: you see top of head from above = shorter silhouette
// yShift < 0 for back-facing: further from camera = higher on isometric plane

interface DirT {
  flipX:  boolean;
  scaleX: number;  // horizontal compression
  scaleY: number;  // vertical compression (2.5D depth illusion)
  yShift: number;  // isometric plane offset
  tint:   number;  // darkness for depth cue
}

function dirTransform(dir: Direction): DirT {
  switch (dir) {
    case "south":     return { flipX: false, scaleX: 1.00, scaleY: 1.00, yShift:  0, tint: 0.00 };
    case "southeast": return { flipX: false, scaleX: 0.80, scaleY: 1.00, yShift: -4, tint: 0.04 };
    case "east":      return { flipX: false, scaleX: 0.35, scaleY: 0.97, yShift: -9, tint: 0.15 };
    case "northeast": return { flipX: true,  scaleX: 0.80, scaleY: 0.93, yShift:-13, tint: 0.22 };
    case "north":     return { flipX: true,  scaleX: 1.00, scaleY: 0.88, yShift:-17, tint: 0.30 };
    case "northwest": return { flipX: true,  scaleX: 0.80, scaleY: 0.93, yShift:-13, tint: 0.22 };
    case "west":      return { flipX: true,  scaleX: 0.35, scaleY: 0.97, yShift: -9, tint: 0.15 };
    case "southwest": return { flipX: false, scaleX: 0.80, scaleY: 1.00, yShift: -4, tint: 0.04 };
  }
}

// ─── Animation offsets — per-frame tables ────────────────────────
// Professional principles encoded per frame:
//  Squash: scaleY < 1 on impact/squat, scaleX widens to compensate
//  Stretch: scaleY > 1 on reach/extension, scaleX narrows
//  Weight: body dips (dy > 0) at mid-stance, rises at contact

interface AnimOffset {
  dx: number; dy: number;
  rot: number;
  scaleX: number; scaleY: number;
  alpha: number;
}

const AO = (dx: number, dy: number, rot: number, scaleX: number, scaleY: number, alpha = 1): AnimOffset =>
  ({ dx, dy, rot, scaleX, scaleY, alpha });

const ANIM_FRAMES: Record<AnimationName, AnimOffset[]> = {
  // Breathing bob — chest rises/falls, subtle scale
  idle: [
    AO( 0,   0,     0,     1.00, 1.00),
    AO( 0,  -1,     0,     0.99, 1.02),
    AO( 0,  -1.5,   0,     0.98, 1.03),
    AO( 0,  -0.5,   0,     0.99, 1.01),
  ],
  // Walk: body bobs down at mid-stance, arms counter-swing torso, NO weapons
  walk: [
    AO( 0,   0,     0,      1.00, 1.00),  // R contact — up
    AO( 1.5, 1.8,   0.022,  1.01, 0.97),  // R down
    AO( 2,   2.5,   0.028,  1.02, 0.96),  // R mid-stance (lowest)
    AO( 1,   1.2,   0.012,  1.01, 0.98),  // R up
    AO( 0,   0,     0,      1.00, 1.00),  // L contact — up
    AO(-1.5, 1.8,  -0.022,  1.01, 0.97),  // L down
    AO(-2,   2.5,  -0.028,  1.02, 0.96),  // L mid-stance (lowest)
    AO(-1,   1.2,  -0.012,  1.01, 0.98),  // L up
  ],
  // Run: exaggerated walk + forward lean (negative dy = lean forward = upward canvas shift)
  run: [
    AO( 0,    0,     0.04,   0.97, 1.03),
    AO( 2.5,  3,     0.06,   1.02, 0.95),
    AO( 3.5,  4.5,   0.07,   1.03, 0.94),
    AO( 1.5,  2,     0.04,   1.01, 0.97),
    AO( 0,    0,    -0.04,   0.97, 1.03),
    AO(-2.5,  3,    -0.06,   1.02, 0.95),
    AO(-3.5,  4.5,  -0.07,   1.03, 0.94),
    AO(-1.5,  2,    -0.04,   1.01, 0.97),
  ],
  // Attack: Anticipation (squat+pull) → STRIKE (stretch!) → Rebound → Recovery
  attack: [
    AO( 0,   0,   0,     1.00, 1.00),  // 0: guard stance
    AO(-5,   2,  -0.12,  1.04, 0.88),  // 1: wind-up ANTICIPATION (squat = height×0.88)
    AO( 8,  -3,   0.08,  0.95, 1.08),  // 2: STRIKE — stretch height×1.08!
    AO(10,  -2,   0.07,  0.96, 1.06),  // 3: peak extension
    AO( 4,  -1,   0.03,  0.99, 1.01),  // 4: rebound follow-through
    AO( 0,   0,   0,     1.00, 1.00),  // 5: recovery
  ],
  // Cast: rise up → peak energy → release → settle
  cast: [
    AO( 0,  0,   0,  1.00, 1.00, 1.0),
    AO( 0, -2,   0,  0.99, 1.02, 1.0),
    AO( 0, -4,   0,  0.97, 1.05, 1.0),
    AO( 0, -5.5, 0,  0.96, 1.06, 1.0),  // peak — maximum stretch upward
    AO( 0, -2.5, 0,  0.98, 1.02, 0.95), // release
    AO( 0,  0,   0,  1.00, 1.00, 0.90), // settle
  ],
  // Hurt: Impact squash → hard recoil → recover
  hurt: [
    AO(-6,  -2, -0.14, 1.05, 0.88, 1.0),  // impact — hard squash
    AO(-10,  0, -0.07, 1.02, 0.95, 0.88), // recoil back
    AO(-4,   0, -0.01, 1.00, 1.00, 1.0),  // return
  ],
  // Death: fall + rotate + fade (gravity — faster as falls)
  death: [
    AO( 0,   0,   0,    1.00, 1.00, 1.00),
    AO( 4,   5,   0.18, 0.98, 0.95, 0.95),
    AO(10,  11,   0.40, 0.97, 0.88, 0.82),
    AO(15,  17,   0.60, 0.96, 0.80, 0.64),
    AO(19,  21,   0.75, 0.95, 0.72, 0.42),
    AO(21,  23,   0.85, 0.94, 0.65, 0.18),
  ],
  // Interact: lean forward + reach
  interact: [
    AO( 0,  0,  0,    1.00, 1.00),
    AO( 4, -1,  0.05, 1.00, 1.00),
    AO( 6, -2,  0.07, 1.00, 1.00),
    AO( 2, -1,  0.03, 1.00, 1.00),
  ],
  // Emote: celebratory bounce
  emote: [
    AO( 0,  0,   0.00, 1.00, 1.00),
    AO( 0, -4,   0.05, 0.98, 1.04),
    AO( 0, -6,   0.07, 0.97, 1.06),
    AO( 0, -4,   0.05, 0.98, 1.04),
  ],
  // Sit: body squashes down into seated position
  sit: [
    AO(0, 8, 0, 1.00, 0.88),
    AO(0, 8, 0, 1.00, 0.88),
    AO(0, 9, 0, 1.00, 0.87),
    AO(0, 8, 0, 1.00, 0.88),
  ],
};

function getAnimOffset(anim: AnimationName, frame: number): AnimOffset {
  const frames = ANIM_FRAMES[anim];
  return frames[frame % frames.length] ?? frames[0];
}

type PoseHint = "idle" | "walk" | "attack";
function animPose(anim: AnimationName): PoseHint {
  if (anim === "walk" || anim === "run")    return "walk";
  if (anim === "attack" || anim === "cast") return "attack";
  return "idle";
}

// ─── Shadow (perspective ellipse) ────────────────────────────────
// For isometric: south-facing shadow is wider, profile is narrower

function drawShadow(
  ctx: CanvasRenderingContext2D, cx: number, bot: number,
  scaleX: number, scaleY: number,
) {
  const rx = 22 * Math.abs(scaleX);
  const ry = 5 * scaleY;
  const g = ctx.createRadialGradient(cx, bot, 0, cx, bot, rx);
  g.addColorStop(0, "rgba(0,0,0,0.38)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, bot, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── AI sprite draw with full transform ──────────────────────────

function drawAISprite(
  ctx: CanvasRenderingContext2D, sprite: HTMLImageElement, S: number,
  dt: DirT, ao: AnimOffset,
) {
  ctx.save();

  const cx = S / 2 + ao.dx;
  const cy = S / 2 + ao.dy;

  ctx.translate(cx, cy);
  ctx.rotate(ao.rot);

  // Combined scale: direction compression × animation squash/stretch
  const sx = ao.scaleX * (dt.flipX ? -dt.scaleX : dt.scaleX);
  const sy = ao.scaleY * dt.scaleY;
  ctx.scale(sx, sy);

  ctx.globalAlpha = Math.max(0, ao.alpha);
  ctx.drawImage(sprite, -S / 2, -S / 2 + dt.yShift / dt.scaleY, S, S);

  ctx.restore();

  if (dt.tint > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(8,8,24,${dt.tint})`;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }
}

// ─── Procedural overlays ─────────────────────────────────────────

const OUTLINE = "#12101a";

function outlined(
  ctx: CanvasRenderingContext2D,
  fill: string | CanvasGradient,
  draw: () => void,
  lw = 1.5,
) {
  ctx.beginPath(); draw();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath(); draw(); ctx.stroke();
}

// ── Aura (secondary motion — independent of body) ────────────────

function drawAura(
  ctx: CanvasRenderingContext2D, S: number, variant: number,
  palette: Palette, frame: number,
) {
  if (variant === 0) return;
  const cx = S / 2, cy = S * 0.48;
  const pulse = 0.45 + Math.sin(frame * 0.7) * 0.25;

  const auraColors: [number,number,number][] = [
    [200, 160, 255],
    [255, 240, 120],  // 1: holy — golden
    [ 60, 220, 100],  // 2: nature — green
    [255, 100,  30],  // 3: fire
    [ 80, 180, 255],  // 4: ice
    [180,  80, 255],  // 5: arcane
  ];
  const ac = auraColors[Math.min(variant, 5)];

  const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 54);
  g.addColorStop(0,   `rgba(${ac[0]},${ac[1]},${ac[2]},${0.22 * pulse})`);
  g.addColorStop(0.5, `rgba(${ac[0]},${ac[1]},${ac[2]},${0.09 * pulse})`);
  g.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, 50, 56, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = `rgba(${ac[0]},${ac[1]},${ac[2]},${0.75 * pulse})`;
  const particleCount = variant === 3 ? 8 : 6; // fire has more particles
  for (let i = 0; i < particleCount; i++) {
    const angle = (frame * 0.45 + i * (Math.PI * 2 / particleCount)) % (Math.PI * 2);
    const r = 26 + Math.sin(frame * 0.7 + i * 1.3) * 8;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r * 0.38;
    const ps = 1.5 + Math.abs(Math.sin(frame * 0.6 + i)) * 1.8;
    ctx.beginPath(); ctx.arc(px, py, ps, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Hair overlay (fallback only) ─────────────────────────────────

function drawHairOverlay(
  ctx: CanvasRenderingContext2D, S: number, variant: number,
  palette: Palette, dt: DirT,
) {
  if (variant === 11) return;
  const cx = S / 2;
  const headCY = S * 0.18;
  const hw = S * 0.108 * dt.scaleX;
  const hh = S * 0.115 * dt.scaleY;
  const hg = ctx.createLinearGradient(cx, headCY - hh, cx, headCY + hh);
  hg.addColorStop(0, rgbToStyle(lighten(palette.hair, 25)));
  hg.addColorStop(1, rgbToStyle(darken(palette.hair, 35)));

  const cap = () => ctx.ellipse(cx, headCY - hh * 0.12, Math.abs(hw) + 1.5, hh * 0.88, 0, Math.PI, 0);
  const side = (ox: number, w: number, h: number) => ctx.roundRect(cx + ox, headCY - hh * 0.3, w, h, 3);

  switch (variant) {
    case 0: case 1: outlined(ctx, hg, cap); break;
    case 2: case 3:
      outlined(ctx, hg, cap);
      outlined(ctx, hg, () => side(-Math.abs(hw) - 1, Math.abs(hw) * 0.6, hh * 1.4));
      outlined(ctx, hg, () => side(Math.abs(hw) * 0.4, Math.abs(hw) * 0.6, hh * 1.4));
      break;
    case 4: case 5: case 10:
      outlined(ctx, hg, () => ctx.roundRect(cx - Math.abs(hw) - 1, headCY - hh * 0.3, (Math.abs(hw) + 1) * 2, S * 0.32, 3));
      outlined(ctx, hg, cap); break;
    case 6:
      outlined(ctx, hg, cap);
      outlined(ctx, hg, () => ctx.roundRect(cx - Math.abs(hw) * 0.25, headCY + hh * 0.3, Math.abs(hw) * 0.5, S * 0.28, 4));
      break;
    case 7:
      outlined(ctx, hg, cap);
      outlined(ctx, hg, () => ctx.ellipse(cx, headCY - hh * 1.1, Math.abs(hw) * 0.4, hh * 0.55, 0, 0, Math.PI * 2));
      break;
    case 8:
      outlined(ctx, hg, cap);
      for (let b = 0; b < 2; b++) {
        const bx = cx + (b === 0 ? -Math.abs(hw) * 0.6 : Math.abs(hw) * 0.6);
        for (let s = 0; s < 4; s++)
          outlined(ctx, hg, () => ctx.ellipse(bx, headCY + hh * 0.5 + s * hh * 0.5, Math.abs(hw) * 0.22, hh * 0.24, 0, 0, Math.PI * 2));
      }
      break;
    case 9:
      outlined(ctx, hg, () => ctx.roundRect(cx - Math.abs(hw) * 0.25, headCY - hh * 2, Math.abs(hw) * 0.5, hh * 1.3, 2));
      outlined(ctx, hg, cap); break;
    default: outlined(ctx, hg, cap); break;
  }
}

// ── Accessory overlay (fallback only) ────────────────────────────

function drawAccessoryOverlay(
  ctx: CanvasRenderingContext2D, S: number, variant: number,
  palette: Palette, dt: DirT,
) {
  if (variant === 0) return;
  const cx = S / 2;
  const headCY = S * 0.18;
  const hw = S * 0.108 * dt.scaleX;
  const hh = S * 0.115 * dt.scaleY;

  const mg = ctx.createLinearGradient(cx, headCY - hh * 1.5, cx, headCY + hh);
  mg.addColorStop(0, rgbToStyle(lighten(palette.metal, 30)));
  mg.addColorStop(1, rgbToStyle(darken(palette.metal, 25)));

  switch (variant) {
    case 1:
      outlined(ctx, rgbToStyle(palette.primary), () =>
        ctx.roundRect(cx - Math.abs(hw) * 1.1, headCY - hh * 0.4, Math.abs(hw) * 2.2, hh * 0.3, 2));
      break;
    case 6:
      outlined(ctx, mg, () => ctx.ellipse(cx, headCY - hh * 0.12, Math.abs(hw) * 1.15, hh * 1.08, 0, Math.PI, 0));
      break;
    case 7:
      outlined(ctx, mg, () => ctx.ellipse(cx, headCY, Math.abs(hw) * 1.1, hh * 1.05, 0, 0, Math.PI * 2));
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(cx - Math.abs(hw) * 0.8, headCY - hh * 0.1, Math.abs(hw) * 1.6, hh * 0.32);
      break;
    case 8: {
      const cg = ctx.createLinearGradient(cx - Math.abs(hw), headCY - hh * 1.5, cx, headCY - hh * 0.6);
      cg.addColorStop(0, rgbToStyle(lighten(palette.trim, 40)));
      cg.addColorStop(1, rgbToStyle(darken(palette.trim, 10)));
      outlined(ctx, cg, () => ctx.roundRect(cx - Math.abs(hw) * 0.9, headCY - hh * 0.78, Math.abs(hw) * 1.8, hh * 0.36, 2));
      for (let i = 0; i < 3; i++) {
        const bx = cx - Math.abs(hw) * 0.52 + i * Math.abs(hw) * 0.52;
        outlined(ctx, cg, () => {
          ctx.moveTo(bx, headCY - hh * 0.78);
          ctx.lineTo(bx + Math.abs(hw) * 0.26, headCY - hh * 1.42);
          ctx.lineTo(bx + Math.abs(hw) * 0.52, headCY - hh * 0.78);
          ctx.closePath();
        });
      }
      break;
    }
    case 9: {
      outlined(ctx, mg, () => ctx.ellipse(cx, headCY - hh * 0.12, Math.abs(hw) * 1.12, hh * 1.08, 0, Math.PI, 0));
      const horn = (hx: number, dir: number) =>
        outlined(ctx, mg, () => {
          ctx.moveTo(hx, headCY - hh * 0.55);
          ctx.quadraticCurveTo(hx + dir * Math.abs(hw) * 0.6, headCY - hh * 1.8, hx + dir * Math.abs(hw) * 0.35, headCY - hh * 2.2);
          ctx.quadraticCurveTo(hx + dir * Math.abs(hw) * 0.15, headCY - hh * 1.6, hx + dir * Math.abs(hw) * 0.06, headCY - hh * 0.62);
          ctx.closePath();
        });
      horn(cx - Math.abs(hw) * 0.88, -1);
      horn(cx + Math.abs(hw) * 0.88,  1);
      break;
    }
    default:
      outlined(ctx, rgbToStyle(palette.primary, 0.85), () =>
        ctx.roundRect(cx - Math.abs(hw) * 1.05, headCY - hh * 0.6, Math.abs(hw) * 2.1, hh * 0.45, 3));
  }
}

// ── Shoulders overlay (fallback only) ────────────────────────────

function drawShouldersOverlay(
  ctx: CanvasRenderingContext2D, S: number, variant: number,
  palette: Palette, dt: DirT,
) {
  if (variant === 0) return;
  const cx = S / 2;
  const shoulderY = S * 0.36;
  const bodyHW = S * 0.14 * dt.scaleX;
  const rx = [0, 5, 6, 7, 9, 8, 7, 10][Math.min(variant, 7)] * (S / 96);
  const ry = [0, 4, 5, 5, 7, 6, 5, 8][Math.min(variant, 7)] * (S / 96);

  const mg = ctx.createLinearGradient(cx, shoulderY - ry, cx, shoulderY + ry * 2);
  mg.addColorStop(0, rgbToStyle(lighten(palette.metal, 30)));
  mg.addColorStop(1, rgbToStyle(darken(palette.metal, 20)));

  const pad = (px: number) =>
    outlined(ctx, mg, () => ctx.ellipse(px, shoulderY + ry * 0.18, rx * Math.abs(dt.scaleX), ry, 0, 0, Math.PI * 2));

  pad(cx - Math.abs(bodyHW) - rx * 0.4);
  pad(cx + Math.abs(bodyHW) + rx * 0.4);
}

// ── Cape overlay (fallback only) ─────────────────────────────────

function drawCapeOverlay(
  ctx: CanvasRenderingContext2D, S: number, variant: number,
  palette: Palette, dt: DirT,
) {
  if (variant === 0) return;
  const cx = S / 2;
  const shoulderY = S * 0.34;
  const tw = S * 0.15 * dt.scaleX;
  const lengths = [0, S*0.22, S*0.33, S*0.50, S*0.44, S*0.32, S*0.55, S*0.5][Math.min(variant, 7)];
  const spread = variant >= 3 ? Math.abs(tw) * 0.8 : Math.abs(tw) * 0.55;

  const cg = ctx.createLinearGradient(cx, shoulderY, cx, shoulderY + lengths);
  cg.addColorStop(0, rgbToStyle(lighten(palette.secondary, 20)));
  cg.addColorStop(1, rgbToStyle(darken(palette.secondary, 45)));

  outlined(ctx, cg, () => {
    ctx.moveTo(cx - Math.abs(tw) * 0.9, shoulderY);
    ctx.lineTo(cx + Math.abs(tw) * 0.9, shoulderY);
    ctx.lineTo(cx + spread, shoulderY + lengths);
    ctx.lineTo(cx - spread, shoulderY + lengths);
    ctx.closePath();
  });
}

// ── Facial overlay (fallback only) ───────────────────────────────

function drawFacialOverlay(
  ctx: CanvasRenderingContext2D, S: number, variant: number,
  palette: Palette, dt: DirT,
) {
  if (variant === 0 || dt.tint > 0.2) return;
  const cx = S / 2;
  const headCY = S * 0.18;
  const hw = S * 0.108 * dt.scaleX;
  const hh = S * 0.115 * dt.scaleY;

  if (variant >= 1 && variant <= 3) {
    const bg = ctx.createLinearGradient(cx, headCY + hh * 0.3, cx, headCY + hh * 1.2);
    bg.addColorStop(0, rgbToStyle(palette.hair));
    bg.addColorStop(1, rgbToStyle(darken(palette.hair, 40)));
    outlined(ctx, bg, () => ctx.ellipse(cx, headCY + hh * (variant >= 2 ? 0.72 : 0.56),
      Math.abs(hw) * (variant >= 2 ? 0.4 : 0.3), hh * (variant >= 2 ? 0.42 : 0.3), 0, 0, Math.PI));
  }
}

// ─── Fallback pure-canvas renderer ───────────────────────────────
// Used when no AI sprite is available.

function drawFallbackCharacter(
  ctx: CanvasRenderingContext2D, S: number, dt: DirT, ao: AnimOffset,
  palette: Palette,
) {
  const cx  = S / 2;
  const bot = S * 0.90;
  const CH  = S * 0.76;
  const top = bot - CH + ao.dy;

  const hw = CH * 0.22 * dt.scaleX;
  const hh = CH * 0.12 * dt.scaleY;
  const tw = CH * 0.28 * dt.scaleX;
  const th = CH * 0.28 * dt.scaleY;
  const lw = CH * 0.11 * dt.scaleX;
  const bh = CH * 0.07;
  const shoulderY = top + CH * 0.26;
  const torsoBot  = top + CH * 0.54;
  const hipY      = top + CH * 0.56;
  const headCY    = top + CH * 0.12;
  const legDy     = ao.dy * 0.5;
  const footLY    = top + CH * 0.88 + legDy;
  const footRY    = top + CH * 0.88 - legDy;
  const lLegLen   = footLY - hipY;
  const rLegLen   = footRY - hipY;

  const rs = (c: RGB, a = 1) => rgbToStyle(c, a);
  const ol = (f: string | CanvasGradient, d: () => void, lw = 1.5) => {
    ctx.beginPath(); d(); ctx.fillStyle = f; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw; ctx.lineJoin = "round";
    ctx.beginPath(); d(); ctx.stroke();
  };
  const vg = (c: RGB, y0: number, h: number) => {
    const g = ctx.createLinearGradient(cx + ao.dx, y0, cx + ao.dx, y0 + h);
    g.addColorStop(0, rs(lighten(c, 25)));
    g.addColorStop(1, rs(darken(c, 35)));
    return g;
  };

  const ox = ao.dx;

  // Cape (behind)
  ol(vg(palette.secondary, shoulderY, CH * 0.38), () => {
    ctx.moveTo(cx - tw * 0.85 + ox, shoulderY); ctx.lineTo(cx + tw * 0.85 + ox, shoulderY);
    ctx.lineTo(cx + tw * 0.5 + ox, shoulderY + CH * 0.38); ctx.lineTo(cx - tw * 0.5 + ox, shoulderY + CH * 0.38);
    ctx.closePath();
  });
  // Legs
  ol(vg(palette.primary, hipY, lLegLen), () => ctx.roundRect(cx - lw - 1 + ox, hipY, lw, lLegLen, 2));
  ol(vg(darken(palette.primary, 20), hipY, rLegLen), () => ctx.roundRect(cx + 1 + ox, hipY, lw, rLegLen, 2));
  // Boots
  ol(vg(palette.secondary, footLY - bh * 0.3, bh * 1.5), () =>
    ctx.roundRect(cx - lw - 2 + ox, footLY - bh * 0.3, lw + 4, bh * 1.4, [0,0,3,5]));
  ol(vg(darken(palette.secondary, 15), footRY - bh * 0.3, bh * 1.5), () =>
    ctx.roundRect(cx + ox, footRY - bh * 0.3, lw + 4, bh * 1.4, [0,0,3,5]));
  // Arms (no weapon — natural hang/swing position)
  const aW = CH * 0.08 * dt.scaleX;
  const armSwing = ao.dx * 0.6; // arms counter-swing to body
  ol(vg(darken(palette.primary, 18), cx - tw / 2 - aW - 1, th * 0.9), () =>
    ctx.roundRect(cx - tw / 2 - aW - 1 + ox - armSwing * 0.5, shoulderY, aW, th * 0.9, 2));
  ol(vg(darken(palette.primary, 30), cx + tw / 2 + 1, th * 0.9), () =>
    ctx.roundRect(cx + tw / 2 + 1 + ox + armSwing * 0.5, shoulderY, aW, th * 0.9, 2));
  // Torso (squash/stretch applied via scaleY)
  ol(vg(palette.primary, shoulderY, th), () => {
    ctx.moveTo(cx - tw / 2 + ox, shoulderY); ctx.lineTo(cx + tw / 2 + ox, shoulderY);
    ctx.lineTo(cx + tw * 0.45 + ox, torsoBot); ctx.lineTo(cx - tw * 0.45 + ox, torsoBot);
    ctx.closePath();
  });
  // Neck
  ol(rs(palette.skin), () => ctx.roundRect(cx - tw * 0.1 + ox, top + CH * 0.23, tw * 0.2, CH * 0.04, 2));
  // Head
  const hGrad = ctx.createLinearGradient(cx + ox, headCY - hh, cx + ox, headCY + hh);
  hGrad.addColorStop(0, rs(lighten(palette.skin, 20)));
  hGrad.addColorStop(1, rs(palette.skinShadow));
  ol(hGrad, () => ctx.ellipse(cx + ox, headCY, Math.abs(hw), hh, 0, 0, Math.PI * 2));
  // Eyes (front-facing only)
  if (dt.tint < 0.18) {
    ctx.fillStyle = "#0e0c1a";
    ctx.beginPath(); ctx.ellipse(cx - Math.abs(hw) * 0.38 + ox, headCY - hh * 0.05, Math.abs(hw) * 0.14, hh * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + Math.abs(hw) * 0.38 + ox, headCY - hh * 0.05, Math.abs(hw) * 0.14, hh * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath(); ctx.arc(cx - Math.abs(hw) * 0.32 + ox, headCY - hh * 0.09, Math.abs(hw) * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + Math.abs(hw) * 0.44 + ox, headCY - hh * 0.09, Math.abs(hw) * 0.045, 0, Math.PI * 2); ctx.fill();
  }
  // Hair cap
  ctx.fillStyle = rs(palette.hair);
  ctx.beginPath(); ctx.ellipse(cx + ox, headCY - hh * 0.12, Math.abs(hw) + 1.5, hh * 0.88, 0, Math.PI, 0); ctx.fill();
}

// ─── Utility: Optimized Checkerboard (O(1) Draw) ──────────────────

const _patternCache = new Map<number, CanvasPattern>();

/** Draws a checkerboard background using a cached CanvasPattern for O(1) performance */
export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  tileSize = 16,
): void {
  let pattern = _patternCache.get(tileSize);

  if (!pattern) {
    const pCanvas = document.createElement("canvas");
    pCanvas.width = tileSize * 2;
    pCanvas.height = tileSize * 2;
    const pCtx = pCanvas.getContext("2d")!;

    pCtx.fillStyle = "#1d1f32"; // BG_LIGHT
    pCtx.fillRect(0, 0, tileSize * 2, tileSize * 2);
    pCtx.fillStyle = "#181924"; // BG_DARK
    pCtx.fillRect(0, 0, tileSize, tileSize);
    pCtx.fillRect(tileSize, tileSize, tileSize, tileSize);

    pattern = ctx.createPattern(pCanvas, "repeat")!;
    _patternCache.set(tileSize, pattern);
  }

  ctx.save();
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── Utility: Shared Offscreen Canvas (GC Optimization) ───────────

let _scratchCanvas: HTMLCanvasElement | null = null;

/** Returns a shared 96x96 offscreen canvas to reduce GC pressure during animation loops */
export function getScratchCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!_scratchCanvas) {
    _scratchCanvas = document.createElement("canvas");
    _scratchCanvas.width = SPRITE_SIZE;
    _scratchCanvas.height = SPRITE_SIZE;
  }
  const ctx = _scratchCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return { canvas: _scratchCanvas, ctx };
}

// ─── Main draw entry point ────────────────────────────────────────

export function drawCharacterFrame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  dir: Direction, anim: AnimationName, frame: number,
  palette: Palette, layers: LayerSpec[],
): void {
  const S = SPRITE_SIZE;
  ctx.save();
  ctx.translate(x, y);

  const dt = dirTransform(dir);
  const ao = getAnimOffset(anim, frame);

  if (ao.alpha < 1) ctx.globalAlpha = Math.max(0, ao.alpha);

  // Index layers for O(1) lookup
  const layerMap: Partial<Record<PartCategory, number>> = {};
  for (let i = 0; i < layers.length; i++) {
    layerMap[layers[i].category] = layers[i].variantIndex;
  }

  // 1. Shadow — perspective ellipse
  drawShadow(ctx, S / 2 + ao.dx, S * 0.90 + dt.yShift * 0.15, dt.scaleX, dt.scaleY);

  // 2. Aura (secondary motion — independent timing)
  const auraVar = layerMap["aura"];
  if (auraVar !== undefined && auraVar > 0) {
    drawAura(ctx, S, auraVar, palette, frame);
  }

  // 3. Determine AI sprite
  const schemeId = palette.id?.split("_").slice(2).join("_") ?? "";
  const spriteType: SpriteType = schemeToSpriteType(schemeId);
  const poseHint = animPose(anim);
  const aiSprite = getSpriteFor(spriteType, poseHint);
  const usingAI  = !!(aiSprite && aiSprite.complete && aiSprite.naturalWidth > 0);

  // 4. Cape (behind body — fallback only)
  if (!usingAI) {
    const capeVar = layerMap["cape"];
    if (capeVar !== undefined && capeVar > 0) {
      drawCapeOverlay(ctx, S, capeVar, palette, dt);
    }
  }

  // 5. Character body
  if (usingAI) {
    drawAISprite(ctx, aiSprite!, S, dt, ao);
  } else {
    drawFallbackCharacter(ctx, S, dt, ao, palette);
  }

  // 6. Procedural overlays (fallback only — AI sprites are already complete)
  if (!usingAI) {
    const shouldersVar = layerMap["shoulders"];
    if (shouldersVar !== undefined && shouldersVar > 0)
      drawShouldersOverlay(ctx, S, shouldersVar, palette, dt);

    const hairVar = layerMap["hair"];
    if (hairVar !== undefined)
      drawHairOverlay(ctx, S, hairVar, palette, dt);

    const facialVar = layerMap["facial"];
    if (facialVar !== undefined && facialVar > 0)
      drawFacialOverlay(ctx, S, facialVar, palette, dt);

    const accessoryVar = layerMap["accessory"];
    if (accessoryVar !== undefined && accessoryVar > 0)
      drawAccessoryOverlay(ctx, S, accessoryVar, palette, dt);
  }

  ctx.restore();
}

export function renderPartSprite(
  category: PartCategory, variantIndex: number,
  dir: Direction, anim: AnimationName, frame: number,
  palette: Palette,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE; canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext("2d")!;
  drawCharacterFrame(ctx, 0, 0, dir, anim, frame, palette, [{ category, variantIndex }]);
  return canvas;
}
