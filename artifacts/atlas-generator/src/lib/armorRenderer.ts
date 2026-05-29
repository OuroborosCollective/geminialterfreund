/**
 * Armor Piece Renderer — draws a single armor slot piece onto a transparent 96×96 canvas.
 *
 * Design philosophy:
 *  - TRANSPARENT background — only armor pixels are rendered
 *  - Same coordinate system as spriteRenderer.ts — pieces overlay perfectly
 *  - Same isometric direction transforms (scaleX/Y, yShift, tint)
 *  - Same animation offsets (squash/stretch, weight, anticipation)
 *  - Cape has extra secondary-motion lag (follow-through principle)
 *
 * Body coordinate reference (S=96, south-facing, no transforms):
 *   headCY  = S*0.18 = 17   head center
 *   shoulderY = S*0.34 = 33   where armor starts at top
 *   torsoBot  = S*0.54 = 52   bottom of torso
 *   hipY      = S*0.56 = 54   hip level
 *   footY     = S*0.88 = 84   foot contact level
 *   legH      = 30px           hip to foot
 *   torsoHW   = S*0.28 = 27   torso half-width (before scaleX)
 *   legHW     = S*0.11 = 11   leg half-width
 *   armHW     = S*0.08 =  8   arm half-width
 */
import type { Direction, AnimationName } from "./partDefinitions";
import { SPRITE_SIZE, ANIMATION_DEFS } from "./partDefinitions";
import type { ArmorSlot, ArmorMaterial, ArmorShapeIndex } from "./armorDefinitions";

// ─── Shared types (mirrored from spriteRenderer to avoid circular deps) ────

interface DirT {
  flipX: boolean;
  scaleX: number;
  scaleY: number;
  yShift: number;
  tint: number;
}

interface AO {
  dx: number; dy: number;
  rot: number;
  scaleX: number; scaleY: number;
  alpha: number;
}

function dirT(dir: Direction): DirT {
  switch (dir) {
    case "south":     return { flipX:false, scaleX:1.00, scaleY:1.00, yShift:  0, tint:0.00 };
    case "southeast": return { flipX:false, scaleX:0.80, scaleY:1.00, yShift: -4, tint:0.04 };
    case "east":      return { flipX:false, scaleX:0.35, scaleY:0.97, yShift: -9, tint:0.15 };
    case "northeast": return { flipX:true,  scaleX:0.80, scaleY:0.93, yShift:-13, tint:0.22 };
    case "north":     return { flipX:true,  scaleX:1.00, scaleY:0.88, yShift:-17, tint:0.30 };
    case "northwest": return { flipX:true,  scaleX:0.80, scaleY:0.93, yShift:-13, tint:0.22 };
    case "west":      return { flipX:true,  scaleX:0.35, scaleY:0.97, yShift: -9, tint:0.15 };
    case "southwest": return { flipX:false, scaleX:0.80, scaleY:1.00, yShift: -4, tint:0.04 };
  }
}

type AO_Table = Record<AnimationName, AO[]>;

const AO_FRAMES: AO_Table = {
  idle: [
    {dx:0,dy:0,   rot:0,    scaleX:1.00,scaleY:1.00,alpha:1},
    {dx:0,dy:-1,  rot:0,    scaleX:0.99,scaleY:1.02,alpha:1},
    {dx:0,dy:-1.5,rot:0,    scaleX:0.98,scaleY:1.03,alpha:1},
    {dx:0,dy:-0.5,rot:0,    scaleX:0.99,scaleY:1.01,alpha:1},
  ],
  walk: [
    {dx:0,   dy:0,  rot:0,     scaleX:1.00,scaleY:1.00,alpha:1},
    {dx:1.5, dy:1.8,rot:0.022, scaleX:1.01,scaleY:0.97,alpha:1},
    {dx:2,   dy:2.5,rot:0.028, scaleX:1.02,scaleY:0.96,alpha:1},
    {dx:1,   dy:1.2,rot:0.012, scaleX:1.01,scaleY:0.98,alpha:1},
    {dx:0,   dy:0,  rot:0,     scaleX:1.00,scaleY:1.00,alpha:1},
    {dx:-1.5,dy:1.8,rot:-0.022,scaleX:1.01,scaleY:0.97,alpha:1},
    {dx:-2,  dy:2.5,rot:-0.028,scaleX:1.02,scaleY:0.96,alpha:1},
    {dx:-1,  dy:1.2,rot:-0.012,scaleX:1.01,scaleY:0.98,alpha:1},
  ],
  run: [
    {dx:0,   dy:0,  rot:0.04, scaleX:0.97,scaleY:1.03,alpha:1},
    {dx:2.5, dy:3,  rot:0.06, scaleX:1.02,scaleY:0.95,alpha:1},
    {dx:3.5, dy:4.5,rot:0.07, scaleX:1.03,scaleY:0.94,alpha:1},
    {dx:1.5, dy:2,  rot:0.04, scaleX:1.01,scaleY:0.97,alpha:1},
    {dx:0,   dy:0,  rot:-0.04,scaleX:0.97,scaleY:1.03,alpha:1},
    {dx:-2.5,dy:3,  rot:-0.06,scaleX:1.02,scaleY:0.95,alpha:1},
    {dx:-3.5,dy:4.5,rot:-0.07,scaleX:1.03,scaleY:0.94,alpha:1},
    {dx:-1.5,dy:2,  rot:-0.04,scaleX:1.01,scaleY:0.97,alpha:1},
  ],
  attack: [
    {dx:0,  dy:0, rot:0,    scaleX:1.00,scaleY:1.00,alpha:1},
    {dx:-5, dy:2, rot:-0.12,scaleX:1.04,scaleY:0.88,alpha:1},
    {dx:8,  dy:-3,rot:0.08, scaleX:0.95,scaleY:1.08,alpha:1},
    {dx:10, dy:-2,rot:0.07, scaleX:0.96,scaleY:1.06,alpha:1},
    {dx:4,  dy:-1,rot:0.03, scaleX:0.99,scaleY:1.01,alpha:1},
    {dx:0,  dy:0, rot:0,    scaleX:1.00,scaleY:1.00,alpha:1},
  ],
  cast: [
    {dx:0,dy:0,  rot:0,scaleX:1.00,scaleY:1.00,alpha:1.0},
    {dx:0,dy:-2, rot:0,scaleX:0.99,scaleY:1.02,alpha:1.0},
    {dx:0,dy:-4, rot:0,scaleX:0.97,scaleY:1.05,alpha:1.0},
    {dx:0,dy:-5.5,rot:0,scaleX:0.96,scaleY:1.06,alpha:1.0},
    {dx:0,dy:-2.5,rot:0,scaleX:0.98,scaleY:1.02,alpha:0.95},
    {dx:0,dy:0,  rot:0,scaleX:1.00,scaleY:1.00,alpha:0.90},
  ],
  hurt: [
    {dx:-6, dy:-2,rot:-0.14,scaleX:1.05,scaleY:0.88,alpha:1.0},
    {dx:-10,dy:0, rot:-0.07,scaleX:1.02,scaleY:0.95,alpha:0.88},
    {dx:-4, dy:0, rot:-0.01,scaleX:1.00,scaleY:1.00,alpha:1.0},
  ],
  death: [
    {dx:0, dy:0, rot:0,   scaleX:1.00,scaleY:1.00,alpha:1.00},
    {dx:4, dy:5, rot:0.18,scaleX:0.98,scaleY:0.95,alpha:0.95},
    {dx:10,dy:11,rot:0.40,scaleX:0.97,scaleY:0.88,alpha:0.82},
    {dx:15,dy:17,rot:0.60,scaleX:0.96,scaleY:0.80,alpha:0.64},
    {dx:19,dy:21,rot:0.75,scaleX:0.95,scaleY:0.72,alpha:0.42},
    {dx:21,dy:23,rot:0.85,scaleX:0.94,scaleY:0.65,alpha:0.18},
  ],
  interact: [
    {dx:0,dy:0, rot:0,   scaleX:1.00,scaleY:1.00,alpha:1},
    {dx:4,dy:-1,rot:0.05,scaleX:1.00,scaleY:1.00,alpha:1},
    {dx:6,dy:-2,rot:0.07,scaleX:1.00,scaleY:1.00,alpha:1},
    {dx:2,dy:-1,rot:0.03,scaleX:1.00,scaleY:1.00,alpha:1},
  ],
  emote: [
    {dx:0,dy:0, rot:0.00,scaleX:1.00,scaleY:1.00,alpha:1},
    {dx:0,dy:-4,rot:0.05,scaleX:0.98,scaleY:1.04,alpha:1},
    {dx:0,dy:-6,rot:0.07,scaleX:0.97,scaleY:1.06,alpha:1},
    {dx:0,dy:-4,rot:0.05,scaleX:0.98,scaleY:1.04,alpha:1},
  ],
  sit: [
    {dx:0,dy:8,rot:0,scaleX:1.00,scaleY:0.88,alpha:1},
    {dx:0,dy:8,rot:0,scaleX:1.00,scaleY:0.88,alpha:1},
    {dx:0,dy:9,rot:0,scaleX:1.00,scaleY:0.87,alpha:1},
    {dx:0,dy:8,rot:0,scaleX:1.00,scaleY:0.88,alpha:1},
  ],
};

function getAO(anim: AnimationName, frame: number): AO {
  const frames = AO_FRAMES[anim];
  return frames[frame % frames.length] ?? frames[0];
}

// ─── Drawing helpers ───────────────────────────────────────────────

type RGB = [number, number, number];
const rs = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const OL = "#0d0b16"; // universal outline

function makeVGrad(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, top: RGB, bot: RGB): CanvasGradient {
  const g = ctx.createLinearGradient(x, y0, x, y1);
  g.addColorStop(0, rs(top)); g.addColorStop(1, rs(bot));
  return g;
}
function makeHGrad(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, l: RGB, r: RGB): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y, x1, y);
  g.addColorStop(0, rs(l)); g.addColorStop(1, rs(r));
  return g;
}

/** Draw shape with outline */
function draw(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, path: () => void, lw = 1.2) {
  ctx.beginPath(); path(); ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = OL; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath(); path(); ctx.stroke();
}

/** Specular highlight dot — for metallic materials */
function specDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mat: ArmorMaterial) {
  if (mat.metallic < 0.4) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rs(mat.specular, mat.metallic * 0.8));
  g.addColorStop(1, rs(mat.specular, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/** Rivet — for leather/iron reinforced shapes */
function rivet(ctx: CanvasRenderingContext2D, x: number, y: number, mat: ArmorMaterial) {
  const rc = mat.tier >= 3 ? mat.trim : mat.mid;
  ctx.fillStyle = rs(rc);
  ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OL; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.stroke();
}

/** Trim line */
function trimLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, mat: ArmorMaterial) {
  ctx.strokeStyle = rs(mat.trim, 0.85);
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

// ─── HELM ──────────────────────────────────────────────────────────

function drawHelm(ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) {
  const cx = S / 2 + ao.dx;
  const baseY = S * 0.18 + ao.dy + dt.yShift;
  const hw = S * 0.108 * Math.abs(dt.scaleX) * ao.scaleX;
  const hh = S * 0.115 * dt.scaleY * ao.scaleY;
  const flip = dt.flipX ? -1 : 1;

  const bg = makeVGrad(ctx, cx, baseY - hh * 1.3, baseY + hh, mat.base, mat.shadow);

  switch (shape) {
    case 0: { // Simple: smooth cap
      draw(ctx, bg, () => ctx.ellipse(cx, baseY - hh * 0.1, hw * 1.08, hh * 1.12, 0, Math.PI, 0));
      specDot(ctx, cx - hw * 0.3, baseY - hh * 0.7, hw * 0.35, mat);
      break;
    }
    case 1: { // Reinforced: cap + nasal bar / chin guard
      draw(ctx, bg, () => ctx.ellipse(cx, baseY - hh * 0.08, hw * 1.1, hh * 1.15, 0, Math.PI, 0));
      // Rim band
      const rimG = makeVGrad(ctx, cx, baseY - hh * 0.05, baseY + hh * 0.25, mat.trim, mat.mid);
      draw(ctx, rimG, () => ctx.roundRect(cx - hw * 1.1, baseY - hh * 0.15, hw * 2.2, hh * 0.28, 2));
      // Nasal bar
      if (mat.metallic > 0.3) {
        draw(ctx, rs(mat.trim), () => ctx.roundRect(cx - hw * 0.07, baseY - hh * 0.1, hw * 0.14, hh * 1.05, 1));
      } else {
        // chin strap for cloth/leather
        ctx.strokeStyle = rs(mat.shadow); ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - hw * 0.8, baseY + hh * 0.12);
        ctx.quadraticCurveTo(cx - hw * 0.6, baseY + hh * 0.9, cx, baseY + hh * 0.95);
        ctx.quadraticCurveTo(cx + hw * 0.6, baseY + hh * 0.9, cx + hw * 0.8, baseY + hh * 0.12);
        ctx.stroke();
      }
      specDot(ctx, cx - hw * 0.25, baseY - hh * 0.65, hw * 0.3, mat);
      break;
    }
    case 2: { // Ornate: crest + decorative lines
      const crestH = mat.tier <= 2 ? hh * 0.8 : hh * 1.0;
      // Main helm
      draw(ctx, bg, () => ctx.ellipse(cx, baseY - hh * 0.08, hw * 1.12, hh * 1.18, 0, Math.PI, 0));
      // Crest / plume
      const crestG = makeVGrad(ctx, cx, baseY - hh - crestH, baseY - hh, mat.trim, mat.mid);
      if (mat.tier <= 1) {
        // Cloth: pointed hat brim or feather
        draw(ctx, crestG, () => {
          ctx.moveTo(cx - hw * 0.18, baseY - hh);
          ctx.lineTo(cx + hw * 0.18, baseY - hh);
          ctx.lineTo(cx + hw * 0.08, baseY - hh - crestH);
          ctx.lineTo(cx, baseY - hh - crestH * 1.3);
          ctx.lineTo(cx - hw * 0.08, baseY - hh - crestH);
          ctx.closePath();
        });
      } else {
        // Metal crest
        draw(ctx, crestG, () => ctx.roundRect(cx - hw * 0.08, baseY - hh - crestH, hw * 0.16, crestH, 2));
      }
      // Decorative trim lines on helm surface
      trimLine(ctx, cx - hw * 0.7, baseY - hh * 0.7, cx + hw * 0.7, baseY - hh * 0.7, mat);
      trimLine(ctx, cx - hw * 0.9, baseY - hh * 0.2, cx + hw * 0.9, baseY - hh * 0.2, mat);
      specDot(ctx, cx - hw * 0.2, baseY - hh * 0.75, hw * 0.28, mat);
      break;
    }
    case 3: { // Elite: full-face / unique silhouette per tier
      if (mat.tier <= 1) {
        // Cloth elite: dramatic pointed arcane hat
        const hatH = hh * 3.2;
        const topW = hw * 0.15;
        const brimW = hw * 1.6;
        const brimH = hh * 0.22;
        const brimY = baseY - hh * 0.1;
        // Hat cone
        draw(ctx, makeVGrad(ctx, cx, brimY - hatH, brimY, mat.base, mat.shadow), () => {
          ctx.moveTo(cx - brimW, brimY);
          ctx.lineTo(cx, brimY - hatH);
          ctx.lineTo(cx + brimW, brimY);
          ctx.closePath();
        });
        // Brim
        draw(ctx, makeVGrad(ctx, cx, brimY, brimY + brimH, mat.trim, mat.shadow), () =>
          ctx.ellipse(cx, brimY + brimH * 0.3, brimW, brimH, 0, 0, Math.PI * 2));
        // Trim stripe on cone
        trimLine(ctx, cx - brimW * 0.6, brimY - hatH * 0.4, cx + brimW * 0.6, brimY - hatH * 0.4, mat);
      } else if (mat.tier <= 2) {
        // Leather elite: war mask with eye slits
        draw(ctx, bg, () => ctx.ellipse(cx, baseY, hw * 1.2, hh * 1.35, 0, Math.PI, 0));
        // Face plate
        draw(ctx, makeVGrad(ctx, cx, baseY - hh * 0.1, baseY + hh * 1.2, mat.mid, mat.shadow), () =>
          ctx.roundRect(cx - hw * 0.88, baseY - hh * 0.05, hw * 1.76, hh * 1.25, 4));
        // Eye slits
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.beginPath(); ctx.roundRect(cx - hw * 0.65 * flip, baseY + hh * 0.3, hw * 0.45, hh * 0.2, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx + hw * 0.2 * flip, baseY + hh * 0.3, hw * 0.45, hh * 0.2, 2); ctx.fill();
        // Nose guard
        draw(ctx, rs(mat.trim), () => ctx.roundRect(cx - hw * 0.08, baseY + hh * 0.05, hw * 0.16, hh * 0.92, 2));
      } else if (mat.tier <= 3) {
        // Iron/chain elite: great helm with cross visor
        draw(ctx, bg, () => ctx.roundRect(cx - hw * 1.12, baseY - hh * 1.05, hw * 2.24, hh * 2.2, 4));
        // Visor face plate
        const vpG = makeVGrad(ctx, cx, baseY - hh * 0.05, baseY + hh, mat.mid, mat.shadow);
        draw(ctx, vpG, () => ctx.roundRect(cx - hw * 1.1, baseY - hh * 0.05, hw * 2.2, hh * 1.1, 3));
        // Cross visor slits
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath(); ctx.roundRect(cx - hw * 0.95, baseY + hh * 0.18, hw * 0.38, hh * 0.22, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx + hw * 0.57, baseY + hh * 0.18, hw * 0.38, hh * 0.22, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx - hw * 0.08, baseY - hh * 0.05, hw * 0.16, hh * 0.82, 2); ctx.fill();
        specDot(ctx, cx - hw * 0.5, baseY - hh * 0.7, hw * 0.32, mat);
        rivet(ctx, cx - hw * 1.0, baseY - hh * 0.8, mat);
        rivet(ctx, cx + hw * 1.0, baseY - hh * 0.8, mat);
      } else {
        // Steel plate elite: winged full-face helmet
        // Wings
        const wingG = makeVGrad(ctx, cx, baseY - hh * 1.5, baseY, mat.trim, mat.mid);
        draw(ctx, wingG, () => {
          const wx = cx + hw * 1.05 * (dt.flipX ? -1 : 1);
          ctx.moveTo(wx, baseY - hh * 0.2);
          ctx.lineTo(wx + 12 * flip, baseY - hh * 1.5);
          ctx.lineTo(wx + 6 * flip, baseY - hh * 0.15);
          ctx.closePath();
        });
        // Main helm dome
        draw(ctx, bg, () => ctx.ellipse(cx, baseY - hh * 0.05, hw * 1.14, hh * 1.2, 0, Math.PI, 0));
        // Face visor
        draw(ctx, makeVGrad(ctx, cx, baseY - hh * 0.05, baseY + hh, mat.mid, mat.shadow), () =>
          ctx.roundRect(cx - hw * 1.08, baseY - hh * 0.05, hw * 2.16, hh * 1.08, 3));
        // Visor slits
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.beginPath(); ctx.roundRect(cx - hw * 0.9, baseY + hh * 0.2, hw * 0.32, hh * 0.18, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx + hw * 0.58, baseY + hh * 0.2, hw * 0.32, hh * 0.18, 2); ctx.fill();
        specDot(ctx, cx - hw * 0.3, baseY - hh * 0.72, hw * 0.38, mat);
        trimLine(ctx, cx - hw * 1.08, baseY - hh * 0.05, cx + hw * 1.08, baseY - hh * 0.05, mat);
      }
      break;
    }
  }
}

// ─── CHEST ─────────────────────────────────────────────────────────

function drawChest(ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) {
  const cx = S / 2 + ao.dx;
  const sy = S * 0.34 + ao.dy;      // shoulder Y
  const tb = S * 0.54 + ao.dy;      // torso bottom
  const tw = S * 0.28 * Math.abs(dt.scaleX) * ao.scaleX;
  const th = (tb - sy) * dt.scaleY * ao.scaleY;
  const taper = 0.78;

  const bg = makeVGrad(ctx, cx, sy, sy + th, mat.base, mat.shadow);

  switch (shape) {
    case 0: { // Simple
      draw(ctx, bg, () => {
        ctx.moveTo(cx - tw, sy); ctx.lineTo(cx + tw, sy);
        ctx.lineTo(cx + tw * taper, sy + th);
        ctx.lineTo(cx - tw * taper, sy + th); ctx.closePath();
      });
      specDot(ctx, cx - tw * 0.3, sy + th * 0.25, tw * 0.25, mat);
      break;
    }
    case 1: { // Reinforced: structural lines + rivets
      draw(ctx, bg, () => {
        ctx.moveTo(cx - tw, sy); ctx.lineTo(cx + tw, sy);
        ctx.lineTo(cx + tw * taper, sy + th);
        ctx.lineTo(cx - tw * taper, sy + th); ctx.closePath();
      });
      // Structural rib
      const ribG = makeVGrad(ctx, cx, sy + th * 0.1, sy + th * 0.9, mat.trim, mat.mid);
      draw(ctx, ribG, () => ctx.roundRect(cx - tw * 0.06, sy + th * 0.1, tw * 0.12, th * 0.8, 2));
      // Side bands
      trimLine(ctx, cx - tw * 0.85, sy + th * 0.3, cx + tw * 0.85, sy + th * 0.3, mat);
      trimLine(ctx, cx - tw * 0.8, sy + th * 0.65, cx + tw * 0.8, sy + th * 0.65, mat);
      // Rivets
      rivet(ctx, cx - tw * 0.75, sy + th * 0.28, mat);
      rivet(ctx, cx + tw * 0.75, sy + th * 0.28, mat);
      rivet(ctx, cx - tw * 0.7, sy + th * 0.63, mat);
      rivet(ctx, cx + tw * 0.7, sy + th * 0.63, mat);
      specDot(ctx, cx - tw * 0.25, sy + th * 0.2, tw * 0.22, mat);
      break;
    }
    case 2: { // Ornate: sculpted pectorals + trim
      draw(ctx, bg, () => {
        ctx.moveTo(cx - tw, sy); ctx.lineTo(cx + tw, sy);
        ctx.lineTo(cx + tw * (taper + 0.04), sy + th * 0.5);
        ctx.lineTo(cx + tw * taper, sy + th);
        ctx.lineTo(cx - tw * taper, sy + th);
        ctx.lineTo(cx - tw * (taper + 0.04), sy + th * 0.5);
        ctx.closePath();
      });
      // Sculpted pectoral halves
      const pG = makeVGrad(ctx, cx, sy + th * 0.08, sy + th * 0.55, mat.mid, mat.base);
      draw(ctx, pG, () => ctx.ellipse(cx - tw * 0.42, sy + th * 0.28, tw * 0.36, th * 0.24, 0, 0, Math.PI * 2));
      draw(ctx, pG, () => ctx.ellipse(cx + tw * 0.42, sy + th * 0.28, tw * 0.36, th * 0.24, 0, 0, Math.PI * 2));
      // Decorative trim border
      trimLine(ctx, cx - tw * 0.95, sy + th * 0.05, cx - tw * 0.95, sy + th * 0.92, mat);
      trimLine(ctx, cx + tw * 0.95, sy + th * 0.05, cx + tw * 0.95, sy + th * 0.92, mat);
      trimLine(ctx, cx - tw * 0.9, sy + th * 0.55, cx + tw * 0.9, sy + th * 0.55, mat);
      specDot(ctx, cx - tw * 0.38, sy + th * 0.2, tw * 0.2, mat);
      specDot(ctx, cx + tw * 0.38, sy + th * 0.2, tw * 0.2, mat);
      break;
    }
    case 3: { // Elite: fantasy plate with unique features
      // Wider, more dramatic shape
      const etw = tw * 1.1;
      draw(ctx, makeVGrad(ctx, cx, sy, sy + th, mat.base, mat.shadow), () => {
        ctx.moveTo(cx - etw, sy); ctx.lineTo(cx + etw, sy);
        ctx.bezierCurveTo(cx + etw * 1.1, sy + th * 0.35, cx + etw * 0.88, sy + th * 0.7, cx + etw * taper, sy + th);
        ctx.lineTo(cx - etw * taper, sy + th);
        ctx.bezierCurveTo(cx - etw * 0.88, sy + th * 0.7, cx - etw * 1.1, sy + th * 0.35, cx - etw, sy);
        ctx.closePath();
      });
      // Central emblem / gem
      if (mat.tier >= 4) {
        const gemG = ctx.createRadialGradient(cx, sy + th * 0.3, 0, cx, sy + th * 0.3, tw * 0.18);
        gemG.addColorStop(0, rs(mat.specular));
        gemG.addColorStop(0.5, rs(mat.trim));
        gemG.addColorStop(1, rs(mat.shadow));
        draw(ctx, gemG, () => ctx.ellipse(cx, sy + th * 0.3, tw * 0.18, tw * 0.18, 0, 0, Math.PI * 2));
      }
      // Deep engrave lines radiating from center
      const radLines = 5;
      for (let i = 0; i < radLines; i++) {
        const angle = (-Math.PI * 0.6) + (i / (radLines - 1)) * Math.PI * 1.2;
        const r1 = tw * 0.22, r2 = tw * 0.72;
        trimLine(ctx, cx + Math.cos(angle) * r1, sy + th * 0.3 + Math.sin(angle) * r1 * 0.6,
                      cx + Math.cos(angle) * r2, sy + th * 0.3 + Math.sin(angle) * r2 * 0.6, mat);
      }
      specDot(ctx, cx - etw * 0.35, sy + th * 0.12, etw * 0.22, mat);
      break;
    }
  }
}

// ─── LEGS ──────────────────────────────────────────────────────────

function drawLegs(ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) {
  const cx = S / 2 + ao.dx;
  const hipY = S * 0.56 + ao.dy;
  const footY = S * 0.86 + ao.dy;
  const lh = (footY - hipY) * dt.scaleY * ao.scaleY;
  const lw = S * 0.11 * Math.abs(dt.scaleX) * ao.scaleX;
  const legDy = ao.dy * 0.4; // leg bob offset

  const drawLeg = (ox: number, lenFactor: number) => {
    const lx = cx + ox;
    const len = lh * lenFactor;
    switch (shape) {
      case 0:
        draw(ctx, makeVGrad(ctx, lx, hipY, hipY + len, mat.base, mat.shadow), () =>
          ctx.roundRect(lx - lw, hipY, lw * 2, len, [0, 0, 3, 3]));
        break;
      case 1: {
        // Leg + knee guard
        draw(ctx, makeVGrad(ctx, lx, hipY, hipY + len, mat.base, mat.shadow), () =>
          ctx.roundRect(lx - lw, hipY, lw * 2, len, [0, 0, 3, 3]));
        const kY = hipY + len * 0.52;
        const kG = makeVGrad(ctx, lx, kY - lh * 0.09, kY + lh * 0.1, mat.trim, mat.mid);
        draw(ctx, kG, () => ctx.ellipse(lx, kY, lw * 1.3, lh * 0.1, 0, 0, Math.PI * 2));
        rivet(ctx, lx, kY, mat);
        break;
      }
      case 2: {
        draw(ctx, makeVGrad(ctx, lx, hipY, hipY + len, mat.base, mat.shadow), () =>
          ctx.roundRect(lx - lw * 1.05, hipY, lw * 2.1, len, [0, 0, 3, 3]));
        // Ornate knee diamond
        const kY = hipY + len * 0.52;
        draw(ctx, makeVGrad(ctx, lx, kY - lh * 0.12, kY + lh * 0.12, mat.trim, mat.shadow), () => {
          ctx.moveTo(lx, kY - lh * 0.12);
          ctx.lineTo(lx + lw * 1.5, kY);
          ctx.lineTo(lx, kY + lh * 0.12);
          ctx.lineTo(lx - lw * 1.5, kY);
          ctx.closePath();
        });
        specDot(ctx, lx - lw * 0.3, hipY + len * 0.2, lw * 0.4, mat);
        break;
      }
      case 3: {
        // Elite: articulated plates
        const platePts = [0, 0.25, 0.52, 0.78, 1.0];
        for (let p = 0; p < platePts.length - 1; p++) {
          const py0 = hipY + len * platePts[p];
          const py1 = hipY + len * platePts[p + 1];
          const pG = makeVGrad(ctx, lx, py0, py1, mat.base, mat.mid);
          draw(ctx, pG, () => ctx.roundRect(lx - lw * (1 + p * 0.05), py0 + 0.5, lw * (2 + p * 0.1), py1 - py0 - 1, 2));
        }
        specDot(ctx, lx - lw * 0.3, hipY + len * 0.15, lw * 0.35, mat);
        break;
      }
    }
  };

  drawLeg(-lw * 1.5, 1 - legDy / 100);
  drawLeg( lw * 1.5, 1 + legDy / 100);
}

// ─── BOOTS ─────────────────────────────────────────────────────────

function drawBoots(ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) {
  const cx = S / 2 + ao.dx;
  const lw = S * 0.11 * Math.abs(dt.scaleX) * ao.scaleX;
  const bh = S * 0.08 * dt.scaleY * ao.scaleY;
  const heights = [bh, bh * 1.7, bh * 2.4, bh * 3.0]; // ankle to full-calf
  const bootH = heights[shape];
  const legDy = ao.dy * 0.4;

  const drawBoot = (ox: number, footDy: number) => {
    const bx = cx + ox;
    const footY = S * 0.86 + ao.dy + footDy;
    const bootTop = footY - bootH + bh * 0.3;

    const bG = makeVGrad(ctx, bx, bootTop, footY + bh * 0.4, mat.base, mat.shadow);

    // Boot shaft
    draw(ctx, bG, () => ctx.roundRect(bx - lw, bootTop, lw * 2, bootH, [2, 2, 0, 0]));

    // Toe cap (extends slightly forward — south direction)
    const toeCap = () => ctx.roundRect(bx - lw * (dt.flipX ? 0.5 : 1.2), footY + bh * 0.02, lw * 1.8, bh * 0.4, [0, 0, 3, 3]);
    draw(ctx, makeVGrad(ctx, bx, footY, footY + bh * 0.4, mat.mid, mat.shadow), toeCap);

    // Shape-specific decoration
    if (shape >= 2) {
      const cuffY = bootTop + bootH * 0.35;
      const cuffG = makeVGrad(ctx, bx, cuffY - bh * 0.12, cuffY + bh * 0.12, mat.trim, mat.mid);
      draw(ctx, cuffG, () => ctx.roundRect(bx - lw * 1.1, cuffY - bh * 0.12, lw * 2.2, bh * 0.24, 2));
      if (shape === 3) {
        trimLine(ctx, bx - lw * 1.05, cuffY + bh * 0.25, bx + lw * 1.05, cuffY + bh * 0.25, mat);
      }
    }
    if (shape === 1 || shape === 3) {
      rivet(ctx, bx - lw * 0.7, footY - bh * 0.15, mat);
      rivet(ctx, bx + lw * 0.7, footY - bh * 0.15, mat);
    }
    specDot(ctx, bx - lw * 0.3, bootTop + bootH * 0.2, lw * 0.3, mat);
  };

  drawBoot(-lw * 1.5, -legDy);
  drawBoot( lw * 1.5,  legDy);
}

// ─── GLOVES ────────────────────────────────────────────────────────

function drawGloves(ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) {
  const cx = S / 2 + ao.dx;
  const armW = S * 0.08 * Math.abs(dt.scaleX) * ao.scaleX;
  const armBot = S * 0.52 + ao.dy;
  const gH = [armW * 1.8, armW * 2.8, armW * 3.5, armW * 4.2][shape];
  const gloveTop = armBot - gH;

  const drawGlove = (ox: number) => {
    const gx = cx + (dt.flipX ? -ox : ox);
    const gG = makeVGrad(ctx, gx, gloveTop, armBot, mat.base, mat.shadow);

    draw(ctx, gG, () => ctx.roundRect(gx - armW, gloveTop, armW * 2, gH, [2, 2, 3, 3]));

    if (shape >= 1) {
      // Cuff band
      const cG = makeVGrad(ctx, gx, gloveTop, gloveTop + armW * 0.4, mat.trim, mat.mid);
      draw(ctx, cG, () => ctx.roundRect(gx - armW * 1.1, gloveTop, armW * 2.2, armW * 0.38, 2));
    }
    if (shape >= 2) {
      // Knuckle detail row
      for (let k = 0; k < 4; k++) {
        const kx = gx - armW * 0.7 + k * (armW * 1.4 / 3);
        draw(ctx, rs(mat.trim), () => ctx.ellipse(kx, armBot - armW * 0.35, armW * 0.18, armW * 0.18, 0, 0, Math.PI * 2));
      }
    }
    if (shape === 3 && mat.tier >= 4) {
      // Elite steel: claw fingers
      for (let f = 0; f < 3; f++) {
        const fx = gx - armW * 0.5 + f * (armW * 0.5);
        draw(ctx, rs(mat.trim), () => {
          ctx.moveTo(fx - armW * 0.1, armBot);
          ctx.lineTo(fx + armW * 0.1, armBot);
          ctx.lineTo(fx, armBot + armW * 0.55);
          ctx.closePath();
        });
      }
    }
    specDot(ctx, gx - armW * 0.25, gloveTop + gH * 0.2, armW * 0.28, mat);
  };

  drawGlove(-S * 0.28 * Math.abs(dt.scaleX) - armW);
  drawGlove( S * 0.28 * Math.abs(dt.scaleX) + armW);
}

// ─── CAPE ──────────────────────────────────────────────────────────

function drawCape(ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) {
  // Cape has SECONDARY MOTION — lags behind body (follow-through principle)
  // Swing amplitude increases with motion magnitude
  const capeSwing = ao.dx * 0.55; // cape lags = reduced dx
  const cx = S / 2 + capeSwing;
  const tw = S * 0.28 * Math.abs(dt.scaleX) * ao.scaleX;
  const sy = S * 0.34 + ao.dy;
  const lengths = [S * 0.20, S * 0.32, S * 0.52, S * 0.64];
  const capeLen = lengths[shape] * dt.scaleY;
  const spreads = [tw * 0.5, tw * 0.72, tw * 0.88, tw * 1.05];
  const spread = spreads[shape];
  const sway = ao.dx * 0.3;

  const cG = makeVGrad(ctx, cx, sy, sy + capeLen, mat.base, mat.shadow);

  switch (shape) {
    case 0: // Short straight
      draw(ctx, cG, () => {
        ctx.moveTo(cx - tw * 0.85, sy); ctx.lineTo(cx + tw * 0.85, sy);
        ctx.lineTo(cx + spread + sway, sy + capeLen);
        ctx.lineTo(cx - spread + sway, sy + capeLen);
        ctx.closePath();
      });
      break;
    case 1: // Mid-length
      draw(ctx, cG, () => {
        ctx.moveTo(cx - tw * 0.88, sy); ctx.lineTo(cx + tw * 0.88, sy);
        ctx.lineTo(cx + spread + sway, sy + capeLen);
        ctx.lineTo(cx + sway, sy + capeLen + S * 0.02); // slight center drape
        ctx.lineTo(cx - spread + sway, sy + capeLen);
        ctx.closePath();
      });
      trimLine(ctx, cx - tw * 0.82, sy + capeLen * 0.7, cx + tw * 0.82 + sway, sy + capeLen * 0.7, mat);
      break;
    case 2: // Long ornate — pointed/shaped hem
      draw(ctx, cG, () => {
        ctx.moveTo(cx - tw * 0.9, sy); ctx.lineTo(cx + tw * 0.9, sy);
        ctx.lineTo(cx + spread + sway, sy + capeLen * 0.7);
        ctx.lineTo(cx + spread * 0.6 + sway, sy + capeLen);
        ctx.lineTo(cx + sway, sy + capeLen + S * 0.04);
        ctx.lineTo(cx - spread * 0.6 + sway, sy + capeLen);
        ctx.lineTo(cx - spread + sway, sy + capeLen * 0.7);
        ctx.closePath();
      });
      // Trim border
      trimLine(ctx, cx - tw * 0.88, sy, cx - spread + sway, sy + capeLen * 0.7, mat);
      trimLine(ctx, cx + tw * 0.88, sy, cx + spread + sway, sy + capeLen * 0.7, mat);
      break;
    case 3: // Full hooded cloak — dramatic
      draw(ctx, cG, () => {
        ctx.moveTo(cx - tw * 0.95, sy); ctx.lineTo(cx + tw * 0.95, sy);
        ctx.bezierCurveTo(
          cx + tw * 1.1 + sway, sy + capeLen * 0.4,
          cx + spread * 1.1 + sway, sy + capeLen * 0.75,
          cx + spread * 0.5 + sway, sy + capeLen
        );
        for (let i = 4; i >= 0; i--) {
          const bx = cx - spread * 0.5 + (i - 2) * (spread * 0.25) + sway;
          const by = sy + capeLen + (i % 2 === 0 ? 0 : S * 0.04);
          if (i === 4) ctx.lineTo(bx, by); else ctx.lineTo(bx, by);
        }
        ctx.bezierCurveTo(
          cx - spread * 1.1 + sway, sy + capeLen * 0.75,
          cx - tw * 1.1 + sway, sy + capeLen * 0.4,
          cx - tw * 0.95, sy
        );
        ctx.closePath();
      });
      // Hood suggestion at top
      const hoodG = makeVGrad(ctx, cx, sy - S * 0.08, sy + S * 0.04, mat.shadow, mat.mid);
      draw(ctx, hoodG, () => ctx.ellipse(cx, sy + S * 0.01, tw * 0.95, S * 0.06, 0, 0, Math.PI * 2));
      trimLine(ctx, cx - tw * 0.9, sy, cx + tw * 0.9, sy, mat);
      break;
  }
}

// ─── BRACERS ───────────────────────────────────────────────────────

function drawBracers(ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) {
  const cx = S / 2 + ao.dx;
  const armW = S * 0.08 * Math.abs(dt.scaleX) * ao.scaleX;
  const armMidY = S * 0.44 + ao.dy;
  const heights = [armW * 1.2, armW * 2.0, armW * 2.8, armW * 3.8][shape];
  const braH = heights;
  const braTop = armMidY - braH / 2;

  const drawBracer = (ox: number) => {
    const bx = cx + (dt.flipX ? -ox : ox);
    const bG = makeVGrad(ctx, bx, braTop, braTop + braH, mat.base, mat.shadow);

    draw(ctx, bG, () => ctx.roundRect(bx - armW * 1.08, braTop, armW * 2.16, braH, 3));

    if (shape >= 1) {
      trimLine(ctx, bx - armW, braTop + braH * 0.15, bx + armW, braTop + braH * 0.15, mat);
      trimLine(ctx, bx - armW, braTop + braH * 0.85, bx + armW, braTop + braH * 0.85, mat);
    }
    if (shape >= 2) {
      // Raised center plate
      draw(ctx, makeVGrad(ctx, bx, braTop + braH * 0.25, braTop + braH * 0.75, mat.trim, mat.mid), () =>
        ctx.roundRect(bx - armW * 0.7, braTop + braH * 0.25, armW * 1.4, braH * 0.5, 2));
    }
    if (shape === 3) {
      // Elite: flange / elbow guard
      const flangeY = braTop - braH * 0.08;
      draw(ctx, makeVGrad(ctx, bx, flangeY, flangeY + braH * 0.25, mat.trim, mat.mid), () => {
        ctx.moveTo(bx - armW * 1.5, flangeY + braH * 0.25);
        ctx.lineTo(bx - armW * 0.8, flangeY);
        ctx.lineTo(bx + armW * 0.8, flangeY);
        ctx.lineTo(bx + armW * 1.5, flangeY + braH * 0.25);
        ctx.closePath();
      });
      rivet(ctx, bx - armW * 0.9, braTop + braH * 0.5, mat);
      rivet(ctx, bx + armW * 0.9, braTop + braH * 0.5, mat);
    }
    specDot(ctx, bx - armW * 0.3, braTop + braH * 0.22, armW * 0.28, mat);
  };

  drawBracer(-S * 0.28 * Math.abs(dt.scaleX) - armW * 0.8);
  drawBracer( S * 0.28 * Math.abs(dt.scaleX) + armW * 0.8);
}

// ─── SHOULDERS ─────────────────────────────────────────────────────

function drawShoulders(ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) {
  const cx = S / 2 + ao.dx;
  const sY = S * 0.34 + ao.dy;
  const tw = S * 0.28 * Math.abs(dt.scaleX) * ao.scaleX;
  const padSizes = [S * 0.065, S * 0.09, S * 0.115, S * 0.15];
  const pr = padSizes[shape];
  const pry = pr * dt.scaleY;

  const drawPauldron = (ox: number) => {
    const px = cx + ox;
    const pG = makeVGrad(ctx, px, sY - pry * 0.4, sY + pry * 1.2, mat.base, mat.shadow);

    switch (shape) {
      case 0: // Small round cap
        draw(ctx, pG, () => ctx.ellipse(px, sY, pr, pry, 0, 0, Math.PI * 2));
        specDot(ctx, px - pr * 0.3, sY - pry * 0.3, pr * 0.3, mat);
        break;
      case 1: // Oval pauldron with edge
        draw(ctx, pG, () => ctx.ellipse(px, sY + pry * 0.15, pr * 1.25, pry * 1.1, 0, 0, Math.PI * 2));
        trimLine(ctx, px - pr * 1.1, sY + pry * 0.15, px + pr * 1.1, sY + pry * 0.15, mat);
        rivet(ctx, px - pr * 0.8, sY, mat);
        rivet(ctx, px + pr * 0.8, sY, mat);
        specDot(ctx, px - pr * 0.3, sY - pry * 0.25, pr * 0.32, mat);
        break;
      case 2: // Winged / flared
        // Base pad
        draw(ctx, pG, () => ctx.ellipse(px, sY + pry * 0.2, pr * 1.3, pry * 1.15, 0, 0, Math.PI * 2));
        // Wing extension
        const wingDir = ox > 0 ? 1 : -1;
        draw(ctx, makeVGrad(ctx, px, sY - pry * 0.6, sY + pry * 0.8, mat.trim, mat.mid), () => {
          ctx.moveTo(px, sY - pry * 0.3);
          ctx.lineTo(px + wingDir * pr * 2.2, sY - pry * 1.1);
          ctx.lineTo(px + wingDir * pr * 2.8, sY + pry * 0.1);
          ctx.lineTo(px + wingDir * pr * 1.6, sY + pry * 0.8);
          ctx.closePath();
        });
        specDot(ctx, px - pr * 0.28, sY - pry * 0.3, pr * 0.3, mat);
        break;
      case 3: // Massive fantasy pauldron
        // Large main body
        draw(ctx, pG, () => {
          const wr = pr * 1.5;
          ctx.moveTo(px - wr * 0.9, sY + pry * 1.2);
          ctx.lineTo(px - wr, sY);
          ctx.bezierCurveTo(px - wr * 0.5, sY - pry * 1.5, px + wr * 0.5, sY - pry * 1.5, px + wr, sY);
          ctx.lineTo(px + wr * 0.9, sY + pry * 1.2);
          ctx.closePath();
        });
        // Spike row at top
        for (let sp = 0; sp < 3; sp++) {
          const sx2 = px - pr * 0.9 + sp * pr * 0.9;
          draw(ctx, rs(mat.trim), () => {
            ctx.moveTo(sx2 - pr * 0.12, sY - pry * 0.8);
            ctx.lineTo(sx2, sY - pry * 1.8);
            ctx.lineTo(sx2 + pr * 0.12, sY - pry * 0.8);
            ctx.closePath();
          });
        }
        specDot(ctx, px - pr * 0.35, sY - pry * 0.35, pr * 0.38, mat);
        // Chain loop
        if (mat.tier >= 3) {
          ctx.strokeStyle = rs(mat.trim, 0.9); ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, sY + pry * 1.2, pr * 0.38, Math.PI * 0.8, Math.PI * 2.2);
          ctx.stroke();
        }
        break;
    }
  };

  drawPauldron(-tw - pr * (0.4 + shape * 0.15));
  drawPauldron( tw + pr * (0.4 + shape * 0.15));
}

// ─── Main draw entry point ─────────────────────────────────────────

const SLOT_FNS: Record<ArmorSlot, (ctx: CanvasRenderingContext2D, S: number, mat: ArmorMaterial, shape: ArmorShapeIndex, dt: DirT, ao: AO) => void> = {
  helm:      drawHelm,
  chest:     drawChest,
  legs:      drawLegs,
  boots:     drawBoots,
  gloves:    drawGloves,
  cape:      drawCape,
  bracers:   drawBracers,
  shoulders: drawShoulders,
};

export function drawArmorPiece(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  slot: ArmorSlot,
  materialIndex: number,
  shapeIndex: ArmorShapeIndex,
  dir: Direction,
  anim: AnimationName,
  frame: number,
): void {
  const S = SPRITE_SIZE;
  const mat = ARMOR_MATERIALS_EXPORT[materialIndex] ?? ARMOR_MATERIALS_EXPORT[0];
  const dt = dirT(dir);
  const frames = AO_FRAMES[anim];
  const ao = frames[frame % frames.length] ?? frames[0];

  ctx.save();
  ctx.translate(x, y);

  // Alpha from animation (death/hurt fading)
  if (ao.alpha < 1) ctx.globalAlpha = Math.max(0, ao.alpha);

  SLOT_FNS[slot](ctx, S, mat, shapeIndex, dt, ao);

  // Depth tint (darker for north-facing)
  if (dt.tint > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(8,8,24,${dt.tint})`;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }

  ctx.restore();
}

// Re-export for use in packer
import { ARMOR_MATERIALS } from "./armorDefinitions";
const ARMOR_MATERIALS_EXPORT = ARMOR_MATERIALS;
