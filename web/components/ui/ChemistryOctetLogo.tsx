'use client'

import { useEffect, useRef } from "react";

interface ChemistryOctetLogoProps {
  /** Size in pixels (both width and height). Default: 400 */
  size?: number;
  /** Background color behind the inner circle. Default: '#f0ede3' */
  background?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * If true, renders ONE frame of the animation and stops — no requestAnimationFrame loop.
   * Use this for every instance that doesn't need to be "alive" (toolbar icon, footer
   * mark, loading spinner, empty states, watermarks). Each *animated* instance runs its
   * own continuous physics + gradient simulation every frame forever; mounting several
   * at once is the #1 cause of page lag. Default: false (animated), for backwards
   * compatibility with existing usages.
   */
  static?: boolean;
}

export default function ChemistryOctetLogo({
  size = 400,
  background = "#f0ede3",
  className,
  style,
  static: isStatic = false,
}: ChemistryOctetLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    // Internal render resolution — 440×440, scaled via CSS (cropped to reduce dead margin)
    const W = 440,
      H = 440;
    const cx = 220,
      cy = 220;

    const rOut = 208;
    const rIn = 150;
    const rBand = (rIn + rOut) / 2;

    const RINGS = [
      { rx: rIn - 10, ry: 56, tilt: 0 },
      { rx: rIn - 10, ry: 56, tilt: Math.PI / 3 },
      { rx: rIn - 10, ry: 56, tilt: -Math.PI / 3 },
    ];
    const RING_SPEEDS = [
      (2 * Math.PI) / 4,
      (2 * Math.PI) / 5.5,
      (2 * Math.PI) / 7,
    ];
    const eAngles = [0, 0, 0];
    let lastTime: number | null = null;

    const NUCLEONS: number[][] = [
      [-10, -5, 5, 15, 0, 0.0, 8.75, 1.0, 0.4, 0.3, 2.75, 1.13, 0.79, 0.97, 1.125, 5.0, 0.38],
      [7.5, 5, -5, 15, 1, 1.2, 8.125, 1.35, 0.7, 0.1, 3.5, 0.88, 1.21, 0.65, 1.375, 6.25, 0.51],
      [27.5, 2.5, 10, 15, 1, 0.5, 10.0, 0.8, 0.2, 0.6, 2.5, 1.37, 0.63, 1.1, 0.875, 4.375, 0.44],
      [-27.5, -2.5, -10, 15, 0, 1.8, 8.5, 1.15, 0.55, 0.45, 3.125, 0.72, 1.05, 0.83, 1.25, 5.625, 0.33],
      [7.5, 22.5, -12.5, 15, 0, 2.3, 11.25, 0.95, 0.1, 0.8, 3.75, 1.05, 0.87, 1.25, 1.625, 7.5, 0.47],
      [-7.5, -22.5, 12.5, 15, 1, 0.9, 7.5, 1.5, 0.85, 0.2, 2.75, 0.93, 1.31, 0.71, 1.0, 4.75, 0.56],
      [-12.5, 10, 25, 15, 1, 1.5, 10.625, 0.7, 0.3, 0.7, 4.0, 1.18, 0.69, 1.02, 1.5, 6.875, 0.41],
      [12.5, -10, -25, 15, 0, 2.7, 9.0, 1.25, 0.6, 0.35, 3.25, 0.81, 1.14, 0.88, 1.125, 5.25, 0.49],
      [15, -17.5, 10, 15, 0, 0.3, 11.875, 0.85, 0.45, 0.55, 3.5, 1.26, 0.74, 1.18, 1.375, 6.5, 0.36],
      [-15, 17.5, -10, 15, 1, 2.0, 6.875, 1.55, 0.75, 0.15, 3.0, 0.97, 1.08, 0.79, 1.25, 6.0, 0.53],
    ];
    // index 4: 0 = proton, 1 = neutron (was string 'p'/'n')
    let nucTheta = 0;
    const NUC_SPEED = (2 * Math.PI) / 14;

    const ELEV = 0.24;
    const cosE = Math.cos(ELEV),
      sinE = Math.sin(ELEV);

    function getNucScreen(n: number[], theta: number, now: number) {
      const t = now * 0.00085;
      const [bX, bY, bZ, , type, ph, oR, oS, tX, tY, pA, f1, f2, f3, jA, dA, dF] = n;
      const oAngle = (t * oS * 2 * Math.PI) / 3.0 + ph;
      const ox = oR * Math.cos(oAngle);
      const oy = oR * Math.sin(oAngle) * Math.cos(tX);
      const oz = oR * Math.sin(oAngle) * Math.sin(tX);
      const wx = Math.sin(t * f1 * 2.0 + ph * 1.3) * pA;
      const wy = Math.cos(t * f2 * 1.8 + ph * 0.85) * pA * 0.65;
      const wz = Math.sin(t * f3 * 2.2 + ph * 1.7 + 1.1) * pA;
      const jx = Math.sin(t * 4.7 + ph * 3.1) * jA;
      const jy = Math.cos(t * 5.3 + ph * 2.4) * jA * 0.5;
      const jz = Math.sin(t * 3.9 + ph * 4.0 + 2.3) * jA;
      const depth = Math.sin(t * dF * Math.PI + ph * 2.1) * dA;
      const x = bX + ox + wx + jx + depth * Math.cos(tY);
      const y = bY + oy + wy + jy;
      const z = bZ + oz + wz + jz + depth * Math.sin(tY);
      const rx = x * Math.cos(theta) + z * Math.sin(theta);
      const ry = y;
      const rz = -x * Math.sin(theta) + z * Math.cos(theta);
      const fy = ry * cosE - rz * sinE;
      const fz = ry * sinE + rz * cosE;
      const s = 320 / (320 + fz);
      return { sx: cx + rx * s, sy: cy - fy * s, ze: fz, r: n[3] * s, type };
    }

    function drawNucleon(p: { sx: number; sy: number; r: number; type: number; ze: number }) {
      const { sx, sy, r, type, ze } = p;
      const dT = Math.max(0, Math.min(1, (ze + 28) / 56));
      const g = ctx.createRadialGradient(sx - r * 0.36, sy - r * 0.36, r * 0.06, sx, sy, r);
      if (type === 0) {
        // proton — red
        g.addColorStop(0, "#ff8098");
        g.addColorStop(0.4, "#cc2040");
        g.addColorStop(1, "#78091e");
      } else {
        // neutron — blue
        g.addColorStop(0, "#7898ff");
        g.addColorStop(0.4, "#2040cc");
        g.addColorStop(1, "#090e78");
      }
      ctx.globalAlpha = 1 - dT * 0.38;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx - r * 0.3, sy - r * 0.32, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function getEPos(k: number, t: number) {
      const ring = RINGS[k];
      const c = Math.cos(ring.tilt),
        s = Math.sin(ring.tilt);
      const ex = ring.rx * Math.cos(t),
        ey = ring.ry * Math.sin(t);
      return { x: cx + ex * c - ey * s, y: cy + ex * s + ey * c };
    }

    function drawElectron(pos: { x: number; y: number }) {
      const r = 11;
      const g = ctx.createRadialGradient(pos.x - 1.5, pos.y - 1.5, 0.5, pos.x, pos.y, r);
      g.addColorStop(0, "#c0a0f0");
      g.addColorStop(0.45, "#7a5ca0");
      g.addColorStop(1, "#3e2060");
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x - 1.4, pos.y - 1.4, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.fill();
    }

    function drawRing(ring: { rx: number; ry: number; tilt: number }) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, ring.rx, ring.ry, ring.tilt, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(175, 100, 255, 0.13)";
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, ring.rx, ring.ry, ring.tilt, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(205, 155, 255, 0.78)";
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Off-screen frame canvas for static ring + text layer
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = W;
    frameCanvas.height = H;
    const fCtx = frameCanvas.getContext("2d")!;

    function arcTextBottom(
      context: CanvasRenderingContext2D,
      text: string,
      r: number,
      centreAngle: number,
      totalSpan: number,
      styleObj: { wt: string; sz: number }
    ) {
      context.textAlign = "center";
      context.textBaseline = "middle";
      const n = text.length;
      const step = totalSpan / n;
      for (let i = 0; i < n; i++) {
        context.font = `${styleObj.wt} ${styleObj.sz}px "DM Sans", sans-serif`;
        const j = n - 1 - i;
        const ang = centreAngle - totalSpan / 2 + (j + 0.5) * step;
        const tx = cx + r * Math.cos(ang);
        const ty = cy + r * Math.sin(ang);
        context.save();
        context.translate(tx, ty);
        context.rotate(ang - Math.PI / 2);
        context.fillText(text[i], 0, 0);
        context.restore();
      }
    }

    function buildFrame() {
      fCtx.clearRect(0, 0, W, H);

      // Band fill
      fCtx.beginPath();
      fCtx.arc(cx, cy, rOut, 0, Math.PI * 2, false);
      fCtx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
      fCtx.fillStyle = "#9b8ab8";
      fCtx.globalAlpha = 1;
      fCtx.fill("evenodd");

      // Band border circles
      fCtx.strokeStyle = "#7a6898";
      fCtx.lineWidth = 3;
      fCtx.globalAlpha = 0.6;
      fCtx.beginPath();
      fCtx.arc(cx, cy, rOut, 0, Math.PI * 2);
      fCtx.stroke();
      fCtx.lineWidth = 2.0;
      fCtx.beginPath();
      fCtx.arc(cx, cy, rIn, 0, Math.PI * 2);
      fCtx.stroke();
      fCtx.globalAlpha = 1;

      const PAD = 0.22;
      const halfSpan = Math.PI / 2 - PAD;
      const TOP_CX = -Math.PI / 2;
      const GAP = 0.13;

      // "@" at 12 o'clock
      fCtx.fillStyle = "#ffffff";
      fCtx.font = '700 40px "DM Sans", sans-serif';
      fCtx.textAlign = "center";
      fCtx.textBaseline = "middle";
      {
        const tx = cx + rBand * Math.cos(TOP_CX);
        const ty = cy + rBand * Math.sin(TOP_CX);
        fCtx.save();
        fCtx.translate(tx, ty);
        fCtx.rotate(TOP_CX + Math.PI / 2);
        fCtx.fillText("@", 0, 0);
        fCtx.restore();
      }

      // LEFT: "Chemistry"
      {
        const text = "Chemistry";
        const styles = [
          { wt: "700", sz: 37 },
          { wt: "700", sz: 37 },
          { wt: "700", sz: 37 },
          { wt: "700", sz: 37 },
          { wt: "700", sz: 37 },
          { wt: "700", sz: 37 },
          { wt: "700", sz: 37 },
          { wt: "700", sz: 37 },
          { wt: "700", sz: 37 },
        ];
        const span = halfSpan - GAP;
        const step = span / text.length;
        fCtx.textAlign = "center";
        fCtx.textBaseline = "middle";
        fCtx.fillStyle = "#ffffff";
        for (let i = 0; i < text.length; i++) {
          fCtx.font = `${styles[i].wt} ${styles[i].sz}px "DM Sans", sans-serif`;
          const ang = TOP_CX - GAP - span + (i + 0.5) * step;
          const tx = cx + rBand * Math.cos(ang);
          const ty = cy + rBand * Math.sin(ang);
          fCtx.save();
          fCtx.translate(tx, ty);
          fCtx.rotate(ang + Math.PI / 2);
          fCtx.fillText(text[i], 0, 0);
          fCtx.restore();
        }
      }

      // RIGHT: "OCTET"
      {
        const text = "OCTET";
        const span = halfSpan - GAP;
        const step = span / text.length;
        fCtx.textAlign = "center";
        fCtx.textBaseline = "middle";
        fCtx.fillStyle = "#ffffff";
        for (let i = 0; i < text.length; i++) {
          fCtx.font = '700 37px "DM Sans", sans-serif';
          const ang = TOP_CX + GAP + (i + 0.5) * step;
          const tx = cx + rBand * Math.cos(ang);
          const ty = cy + rBand * Math.sin(ang);
          fCtx.save();
          fCtx.translate(tx, ty);
          fCtx.rotate(ang + Math.PI / 2);
          fCtx.fillText(text[i], 0, 0);
          fCtx.restore();
        }
      }

      // BOTTOM: "SPREAD TRUE SCIENCE"
      fCtx.fillStyle = "#ffffff";
      arcTextBottom(fCtx, "SPREAD TRUE SCIENCE", rBand, Math.PI / 2, Math.PI - 2 * PAD, {
        wt: "700",
        sz: 40.0,
      });

      // Stars at 3 o'clock and 9 o'clock
      fCtx.font = '900 30px "DM Sans", sans-serif';
      fCtx.fillStyle = "#ffffff";
      fCtx.textAlign = "center";
      fCtx.textBaseline = "middle";
      fCtx.globalAlpha = 0.92;
      fCtx.fillText("★", cx - rBand, cy);
      fCtx.fillText("★", cx + rBand, cy);
      fCtx.globalAlpha = 1;
    }

    let rafId: number | undefined;
    const TARGET_FPS = 20;
    const FRAME_INTERVAL = 1 / TARGET_FPS; // seconds
    let accumulator = 0;

    function renderFrame(ts: number, dt: number) {
      nucTheta += dt * NUC_SPEED;
      for (let k = 0; k < 3; k++) eAngles[k] += dt * RING_SPEEDS[k];

      ctx.clearRect(0, 0, W, H);

      // Clip to inner circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
      ctx.clip();

      // Background fill
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, H);

      // Orbital rings
      RINGS.forEach(drawRing);

      // Electrons (pair per ring)
      for (let k = 0; k < 3; k++) {
        drawElectron(getEPos(k, eAngles[k]));
        drawElectron(getEPos(k, eAngles[k] + Math.PI));
      }

      // Nucleus glow
      const glow = ctx.createRadialGradient(cx, cy, 14, cx, cy, 58);
      glow.addColorStop(0, "rgba(160,30,80,0.22)");
      glow.addColorStop(1, "rgba(160,30,80,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 58, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Nucleons sorted back-to-front
      const pts = NUCLEONS.map((n) => getNucScreen(n, nucTheta, ts));
      pts.sort((a, b) => b.ze - a.ze);
      pts.forEach(drawNucleon);

      ctx.restore();

      // Composite static frame (band + text)
      ctx.drawImage(frameCanvas, 0, 0);
    }

    function draw(ts: number) {
      if (!lastTime) lastTime = ts;
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      accumulator += dt;
      // Throttle: only actually redraw (and recompute gradients) ~20x/sec.
      // We still request the next frame every tick to keep scheduling smooth,
      // but skip the expensive draw work in between.
      if (accumulator >= FRAME_INTERVAL) {
        renderFrame(ts, accumulator);
        accumulator = 0;
      }
      rafId = requestAnimationFrame(draw);
    }

    // Wait for DM Sans to load, then build static frame.
    // STATIC MODE: render exactly one frame and stop — no rAF loop, no continuous
    // gradient recompute. This is what every "decorative" instance of the logo
    // (toolbar, footer, loading spinner, watermark) should use.
    // ANIMATED MODE (default): full continuous loop, as before.
    document.fonts.ready.then(() => {
      buildFrame();
      if (isStatic) {
        // Fixed timestamp gives a consistent, nicely-scattered single frame —
        // same trick already used in getStaticWatermarkCanvas() below.
        const FIXED_TS = 8000;
        renderFrame(FIXED_TS, 0);
      } else {
        rafId = requestAnimationFrame(draw);
      }
    });

    frameRef.current = rafId ?? 0;

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, [background, isStatic]);

  return (
    <canvas
      ref={canvasRef}
      width={440}
      height={440}
      className={className}
      style={{
        width: size,
        height: size,
        display: "block",
        ...style,
      }}
    />
  );
}

// ─── PDF WATERMARK EXTRACTOR ──────────────────────────────────────────────────
// Renders exactly one frame of the animation invisibly to bake into PDF pages
export async function getStaticWatermarkCanvas(): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 440; canvas.height = 440;
  const ctx = canvas.getContext("2d")!;
  
  const cx = 220, cy = 220, rOut = 208, rIn = 150, rBand = (rIn + rOut) / 2;
  const ts = 8000; // Fast-forward time to scatter orbitals nicely
  const nucTheta = (ts / 1000) * ((2 * Math.PI) / 14);
  const eAngles = [(ts/1000)*(2*Math.PI)/4, (ts/1000)*(2*Math.PI)/5.5, (ts/1000)*(2*Math.PI)/7];

  const RINGS = [
    { rx: rIn - 10, ry: 56, tilt: 0 },
    { rx: rIn - 10, ry: 56, tilt: Math.PI / 3 },
    { rx: rIn - 10, ry: 56, tilt: -Math.PI / 3 },
  ];

  const NUCLEONS: number[][] = [
    [-10, -5, 5, 15, 0, 0.0, 8.75, 1.0, 0.4, 0.3, 2.75, 1.13, 0.79, 0.97, 1.125, 5.0, 0.38],
    [7.5, 5, -5, 15, 1, 1.2, 8.125, 1.35, 0.7, 0.1, 3.5, 0.88, 1.21, 0.65, 1.375, 6.25, 0.51],
    [27.5, 2.5, 10, 15, 1, 0.5, 10.0, 0.8, 0.2, 0.6, 2.5, 1.37, 0.63, 1.1, 0.875, 4.375, 0.44],
    [-27.5, -2.5, -10, 15, 0, 1.8, 8.5, 1.15, 0.55, 0.45, 3.125, 0.72, 1.05, 0.83, 1.25, 5.625, 0.33],
    [7.5, 22.5, -12.5, 15, 0, 2.3, 11.25, 0.95, 0.1, 0.8, 3.75, 1.05, 0.87, 1.25, 1.625, 7.5, 0.47],
    [-7.5, -22.5, 12.5, 15, 1, 0.9, 7.5, 1.5, 0.85, 0.2, 2.75, 0.93, 1.31, 0.71, 1.0, 4.75, 0.56],
    [-12.5, 10, 25, 15, 1, 1.5, 10.625, 0.7, 0.3, 0.7, 4.0, 1.18, 0.69, 1.02, 1.5, 6.875, 0.41],
    [12.5, -10, -25, 15, 0, 2.7, 9.0, 1.25, 0.6, 0.35, 3.25, 0.81, 1.14, 0.88, 1.125, 5.25, 0.49],
    [15, -17.5, 10, 15, 0, 0.3, 11.875, 0.85, 0.45, 0.55, 3.5, 1.26, 0.74, 1.18, 1.375, 6.5, 0.36],
    [-15, 17.5, -10, 15, 1, 2.0, 6.875, 1.55, 0.75, 0.15, 3.0, 0.97, 1.08, 0.79, 1.25, 6.0, 0.53],
  ];

  const ELEV = 0.24; const cosE = Math.cos(ELEV), sinE = Math.sin(ELEV);

  function getNucScreen(n: number[], theta: number, now: number) {
    const t = now * 0.00085;
    const [bX, bY, bZ, , type, ph, oR, oS, tX, tY, pA, f1, f2, f3, jA, dA, dF] = n;
    const oAngle = (t * oS * 2 * Math.PI) / 3.0 + ph;
    const ox = oR * Math.cos(oAngle); const oy = oR * Math.sin(oAngle) * Math.cos(tX); const oz = oR * Math.sin(oAngle) * Math.sin(tX);
    const wx = Math.sin(t * f1 * 2.0 + ph * 1.3) * pA; const wy = Math.cos(t * f2 * 1.8 + ph * 0.85) * pA * 0.65; const wz = Math.sin(t * f3 * 2.2 + ph * 1.7 + 1.1) * pA;
    const jx = Math.sin(t * 4.7 + ph * 3.1) * jA; const jy = Math.cos(t * 5.3 + ph * 2.4) * jA * 0.5; const jz = Math.sin(t * 3.9 + ph * 4.0 + 2.3) * jA;
    const depth = Math.sin(t * dF * Math.PI + ph * 2.1) * dA;
    const x = bX + ox + wx + jx + depth * Math.cos(tY); const y = bY + oy + wy + jy; const z = bZ + oz + wz + jz + depth * Math.sin(tY);
    const rx = x * Math.cos(theta) + z * Math.sin(theta); const ry = y; const rz = -x * Math.sin(theta) + z * Math.cos(theta);
    const fy = ry * cosE - rz * sinE; const fz = ry * sinE + rz * cosE;
    const s = 320 / (320 + fz);
    return { sx: cx + rx * s, sy: cy - fy * s, ze: fz, r: n[3] * s, type };
  }

  // Draw Band & Text
  ctx.beginPath(); ctx.arc(cx, cy, rOut, 0, Math.PI * 2, false); ctx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
  ctx.fillStyle = "#9b8ab8"; ctx.fill("evenodd");
  ctx.strokeStyle = "#7a6898"; ctx.lineWidth = 3; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(cx, cy, rOut, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2.0; ctx.beginPath(); ctx.arc(cx, cy, rIn, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;

  const PAD = 0.22, halfSpan = Math.PI / 2 - PAD, TOP_CX = -Math.PI / 2, GAP = 0.13;
  ctx.fillStyle = "#ffffff"; ctx.font = '700 40px "DM Sans", sans-serif'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.save(); ctx.translate(cx + rBand * Math.cos(TOP_CX), cy + rBand * Math.sin(TOP_CX)); ctx.rotate(TOP_CX + Math.PI / 2); ctx.fillText("@", 0, 0); ctx.restore();

  const textL = "Chemistry"; for (let i = 0; i < textL.length; i++) {
    ctx.font = `700 37px "DM Sans", sans-serif`; const ang = TOP_CX - GAP - (halfSpan - GAP) + (i + 0.5) * ((halfSpan - GAP) / textL.length);
    ctx.save(); ctx.translate(cx + rBand * Math.cos(ang), cy + rBand * Math.sin(ang)); ctx.rotate(ang + Math.PI / 2); ctx.fillText(textL[i], 0, 0); ctx.restore();
  }
  const textR = "OCTET"; for (let i = 0; i < textR.length; i++) {
    ctx.font = '700 37px "DM Sans", sans-serif'; const ang = TOP_CX + GAP + (i + 0.5) * ((halfSpan - GAP) / textR.length);
    ctx.save(); ctx.translate(cx + rBand * Math.cos(ang), cy + rBand * Math.sin(ang)); ctx.rotate(ang + Math.PI / 2); ctx.fillText(textR[i], 0, 0); ctx.restore();
  }
  const txtB = "SPREAD TRUE SCIENCE"; const stepB = (Math.PI - 2 * PAD) / txtB.length;
  for (let i = 0; i < txtB.length; i++) {
    ctx.font = `700 40px "DM Sans", sans-serif`; const ang = Math.PI/2 - (Math.PI - 2 * PAD)/2 + ((txtB.length - 1 - i) + 0.5) * stepB;
    ctx.save(); ctx.translate(cx + rBand * Math.cos(ang), cy + rBand * Math.sin(ang)); ctx.rotate(ang - Math.PI / 2); ctx.fillText(txtB[i], 0, 0); ctx.restore();
  }
  ctx.font = '900 30px "DM Sans", sans-serif'; ctx.globalAlpha = 0.92; ctx.fillText("★", cx - rBand, cy); ctx.fillText("★", cx + rBand, cy); ctx.globalAlpha = 1;

  // Draw 3D Core
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rIn, 0, Math.PI * 2); ctx.clip();
  
  RINGS.forEach(ring => {
    ctx.beginPath(); ctx.ellipse(cx, cy, ring.rx, ring.ry, ring.tilt, 0, Math.PI * 2); ctx.strokeStyle = "rgba(175, 100, 255, 0.13)"; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, ring.rx, ring.ry, ring.tilt, 0, Math.PI * 2); ctx.strokeStyle = "rgba(205, 155, 255, 0.78)"; ctx.lineWidth = 1.8; ctx.stroke();
  });
  
  for (let k = 0; k < 3; k++) {
    [eAngles[k], eAngles[k] + Math.PI].forEach(t => {
      const ex = RINGS[k].rx * Math.cos(t), ey = RINGS[k].ry * Math.sin(t);
      const px = cx + ex * Math.cos(RINGS[k].tilt) - ey * Math.sin(RINGS[k].tilt), py = cy + ex * Math.sin(RINGS[k].tilt) + ey * Math.cos(RINGS[k].tilt);
      const g = ctx.createRadialGradient(px - 1.5, py - 1.5, 0.5, px, py, 11);
      g.addColorStop(0, "#c0a0f0"); g.addColorStop(0.45, "#7a5ca0"); g.addColorStop(1, "#3e2060");
      ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
    });
  }

  const pts = NUCLEONS.map(n => getNucScreen(n, nucTheta, ts)).sort((a, b) => b.ze - a.ze);
  pts.forEach(p => {
    const dT = Math.max(0, Math.min(1, (p.ze + 28) / 56));
    const g = ctx.createRadialGradient(p.sx - p.r * 0.36, p.sy - p.r * 0.36, p.r * 0.06, p.sx, p.sy, p.r);
    if (p.type === 0) { g.addColorStop(0, "#ff8098"); g.addColorStop(0.4, "#cc2040"); g.addColorStop(1, "#78091e"); }
    else { g.addColorStop(0, "#7898ff"); g.addColorStop(0.4, "#2040cc"); g.addColorStop(1, "#090e78"); }
    ctx.globalAlpha = 1 - dT * 0.38; ctx.beginPath(); ctx.arc(p.sx, p.sy, p.r, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
    ctx.globalAlpha = 1;
  });
  ctx.restore();

  return canvas;
}