/**
 * ChemistryBanner.tsx
 * ------------------------------------------------------------------------
 * An interactive hero: colorful cloth pennants hung on a rope with wooden
 * clothespins, spelling out "CHEMISTRY" in golden 3D letters — themed to the
 * site's soft cream + plum pastel palette (NOT the loud rainbow reference).
 *
 * • Pure CSS/SVG — no image assets, fully responsive & recolorable.
 * • No `'use client'` needed: all interactivity is pure CSS (:hover + keyframes),
 *   so this works as a React Server Component.
 * • Data-driven: edit the BANNERS array (or pass a `word` prop) to change it.
 *
 * Drop-in usage:
 *     import ChemistryBanner from "@/components/ChemistryBanner";
 *     <ChemistryBanner />
 *
 * NOTE: The <style> block below is embedded so the file is self-contained. If
 * you'd rather keep styles centralized, move the @keyframes / .cb-* rules into
 * your globals.css — nothing else needs to change.
 * ------------------------------------------------------------------------
 */

import type { CSSProperties } from "react";

type Banner = {
  letter: string;
  /** Cloth base colour — kept within the site's pastel accent family. */
  color: string;
  /** Faint decorative chemistry formula printed on the cloth. */
  formula: string;
  /** Decorative motif drawn on the cloth. */
  motif: "atom" | "benzene" | "molecule";
};

/**
 * Themed pastel palette (from globals.css @theme tokens):
 *   accent1 gold #e9deb5 · accent2 mint #daeae4 · accent3 lilac #d4c5e2
 *   accent4 teal #c8e0da · plum/brand tints derived from primary #5e4075
 * Adjacent banners use different colours so the row reads clearly.
 */
const BANNERS: Banner[] = [
  { letter: "C", color: "#e9deb5", formula: "CH₄", motif: "atom" }, // gold
  { letter: "H", color: "#c8e0da", formula: "H₂O", motif: "molecule" }, // teal
  { letter: "E", color: "#d4c5e2", formula: "C₆H₆", motif: "benzene" }, // lilac
  { letter: "M", color: "#b89cd0", formula: "NaCl", motif: "atom" }, // deep lilac
  { letter: "I", color: "#daeae4", formula: "H₂SO₄", motif: "molecule" }, // mint
  { letter: "S", color: "#cbb3df", formula: "CO₂", motif: "benzene" }, // plum tint
  { letter: "T", color: "#a98fc4", formula: "O₂", motif: "atom" }, // muted plum
  { letter: "R", color: "#c8e0da", formula: "C₂H₅OH", motif: "molecule" }, // teal
  { letter: "Y", color: "#e9deb5", formula: "NH₃", motif: "benzene" }, // gold
];

/**
 * Vertical drop of each banner so the row follows the rope's sag — middle
 * banners hang lower than the ends, mirroring the reference image.
 */
const SAG_OFFSETS = [0, 11, 20, 27, 31, 27, 20, 11, 0];

type ChemistryBannerProps = {
  /** Override the word (defaults to "CHEMISTRY"). Colours/formulas cycle from BANNERS. */
  word?: string;
  className?: string;
};

export default function ChemistryBanner({
  word,
  className = "",
}: ChemistryBannerProps) {
  // Build the banner list. If a custom word is supplied, cycle the styling.
  const banners: Banner[] = word
    ? word
        .toUpperCase()
        .split("")
        .map((letter, i) => ({ ...BANNERS[i % BANNERS.length], letter }))
    : BANNERS;

  const label = (word ?? "Chemistry").toLowerCase();

  return (
    <section
      className={`cb-hero ${className}`}
      aria-label={label.charAt(0).toUpperCase() + label.slice(1)}
    >
      <style>{STYLES}</style>

      {/* Two-tone split: cream fills everything ABOVE the rope curve (full screen width);
          the section's base colour (pale plum) shows BELOW it. The rope is drawn on the
          exact same curve, so it lies precisely on the boundary between the sections. */}
      <svg
        className="cb-divider"
        viewBox="0 0 1000 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M 0 0 H 1000 V 30 Q 500 110 0 30 Z" fill="#f8f9ed" />
      </svg>

      {/* Rope: one gently sagging twine line, edge to edge, sitting on the colour boundary. */}
      <svg
        className="cb-rope"
        viewBox="0 0 1000 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* soft shadow just under the rope */}
        <path
          d="M 0 36 Q 500 116 1000 36"
          className="cb-rope-shadow"
          fill="none"
        />
        {/* main twine + a thin highlight strand for a braided feel */}
        <path
          d="M 0 30 Q 500 110 1000 30"
          className="cb-rope-main"
          fill="none"
        />
        <path
          d="M 0 30 Q 500 110 1000 30"
          className="cb-rope-strand"
          fill="none"
        />
      </svg>

      {/* faint DOT grid across the WHOLE banner (above + below the rope) — uses
          the canonical page-wide dots (.dots-fx) so it matches AND aligns with
          the Hero above and ElementsSection below, leaving no seam at the edges. */}
      <div
        className="dots-fx"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* NOTE: the banner has NO gradient at all — only the two solid tones
          (cream above the rope, #e6eeeb below) + the shared .dots-fx grid, so
          it matches the Hero above and ElementsSection below with no seam. */}

      <div className="cb-stage" role="img" aria-label={label}>
        {/* The banners. */}
        <ul className="cb-row">
          {banners.map((b, i) => {
            const drop = SAG_OFFSETS[i % SAG_OFFSETS.length] ?? 0;
            // Per-banner animation tuning so they sway out of phase = natural wind.
            const styleVars = {
              "--cb-cloth": b.color,
              "--cb-drop": `${drop}px`,
              "--cb-delay": `${(i * 0.37).toFixed(2)}s`,
              "--cb-dur": `${(4.6 + (i % 3) * 0.5).toFixed(2)}s`,
              "--cb-tilt": i % 2 === 0 ? "1" : "-1", // alternate rest tilt
            } as CSSProperties;

            return (
              <li
                key={i}
                className="cb-peg"
                style={styleVars}
                aria-hidden="true"
              >
                {/* Wooden clothespin clipping the cloth to the rope. */}
                <span className="cb-pin">
                  <span className="cb-pin-spring" />
                </span>

                {/* The swinging cloth pennant.
                    .cb-cloth = hover swing (transition); .cb-swing = idle sway
                    (animation). They're nested so the two transforms compose
                    instead of fighting over the same property. */}
                <div className="cb-cloth">
                  <div className="cb-swing">
                    <div className="cb-cloth-inner">
                      {/* subtle decorations */}
                      <span className="cb-formula cb-formula-top">
                        {b.formula}
                      </span>
                      <Motif kind={b.motif} />
                      <span className="cb-formula cb-formula-bottom">
                        {b.formula}
                      </span>

                      {/* the golden 3D letter */}
                      <span className="cb-letter">{b.letter}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---- decorative chemistry motifs (faint, non-interactive) -------------- */

function Motif({ kind }: { kind: Banner["motif"] }) {
  if (kind === "benzene") {
    return (
      <svg className="cb-motif" viewBox="0 0 60 60" aria-hidden="true">
        <polygon
          points="30,8 50,19 50,41 30,52 10,41 10,19"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="30"
          cy="30"
          r="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (kind === "molecule") {
    return (
      <svg className="cb-motif" viewBox="0 0 60 60" aria-hidden="true">
        <line
          x1="14"
          y1="40"
          x2="30"
          y2="22"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="30"
          y1="22"
          x2="46"
          y2="40"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="30"
          y1="22"
          x2="30"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="14" cy="40" r="6" fill="currentColor" />
        <circle cx="46" cy="40" r="6" fill="currentColor" />
        <circle cx="30" cy="22" r="7" fill="currentColor" />
        <circle cx="30" cy="6" r="4" fill="currentColor" />
      </svg>
    );
  }
  // atom
  return (
    <svg className="cb-motif" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r="4" fill="currentColor" />
      <ellipse
        cx="30"
        cy="30"
        rx="22"
        ry="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <ellipse
        cx="30"
        cy="30"
        rx="22"
        ry="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        transform="rotate(60 30 30)"
      />
      <ellipse
        cx="30"
        cy="30"
        rx="22"
        ry="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        transform="rotate(120 30 30)"
      />
    </svg>
  );
}

/* ---- styles (self-contained; move to globals.css if preferred) --------- */

const STYLES = `
/* Separator band: two SOLID colours split along the rope's curve — cream above
   (matches the section above) and pale plum below (matches the section below),
   so the rope lies exactly on the boundary between the two sections. */
.cb-hero {
  position: relative;
  width: 100%;
  padding: 0 1rem clamp(0.75rem, 2.2vw, 1.6rem);
  overflow: hidden;
  background-color: #e6eeeb; /* the colour BELOW the rope */
}

.cb-stage {
  position: relative;
  z-index: 2;                    /* pennants sit above the rope */
  max-width: min(1560px, 94vw);  /* ← controls how WIDE the pennants spread across the page */
  margin: 0 auto;
}

/* cream fill covering everything ABOVE the rope curve — full screen width */
/* --- rope: one drooping line spanning the whole screen, on the colour boundary --- */
.cb-divider,
.cb-rope {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;                     /* ← full screen width; THIS makes the rope reach both edges */
  height: clamp(58px, 8.5vw, 104px); /* ← rope droop depth (bigger = deeper sag) */
  pointer-events: none;
}
.cb-divider { z-index: 0; }
.cb-rope { z-index: 1; }
.cb-rope-shadow { stroke: rgba(0, 0, 0, 0.20); stroke-width: 7; }
.cb-rope-main   { stroke: #c9a96a; stroke-width: 5; stroke-linecap: round; }
.cb-rope-strand { stroke: #e4cf9c; stroke-width: 1.6; stroke-dasharray: 5 6; stroke-linecap: round; }

/* --- banner row --- */
.cb-row {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: clamp(2px, 1.1vw, 14px);
  padding: 0;
  margin: 0;
  list-style: none;
  padding-top: clamp(18px, 3vw, 34px);
}

.cb-peg {
  position: relative;
  margin-top: var(--cb-drop);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* --- clothespin --- */
.cb-pin {
  position: relative;
  z-index: 3;
  width: clamp(9px, 1.1vw, 13px);
  height: clamp(20px, 2.6vw, 30px);
  border-radius: 3px;
  background: linear-gradient(180deg, #e8c98f 0%, #cda35f 55%, #b6883f 100%);
  box-shadow: inset 0 0 0 1px rgba(120, 80, 30, 0.25), 0 1px 2px rgba(80, 50, 10, 0.25);
  margin-bottom: -4px;
}
.cb-pin-spring {
  position: absolute;
  top: 38%;
  left: 50%;
  width: 70%;
  height: 2px;
  transform: translateX(-50%);
  background: rgba(110, 70, 25, 0.45);
  border-radius: 2px;
  box-shadow: 0 3px 0 rgba(110, 70, 25, 0.30);
}

/* --- cloth pennant --- */
.cb-cloth {
  width: clamp(54px, 8.6vw, 104px);
  transform-origin: top center;
  /* springy transition handles the hover swing */
  transition: transform 1.1s cubic-bezier(0.22, 1.4, 0.36, 1);
  will-change: transform;
  /* soft cast shadow so the cloth reads as a real hanging pennant */
  filter: drop-shadow(0 6px 6px rgba(94, 64, 117, 0.22));
}
.cb-swing {
  transform-origin: top center;
  will-change: transform;
}
.cb-cloth-inner {
  position: relative;
  width: 100%;
  aspect-ratio: 0.62 / 1;
  color: var(--cb-cloth);
  /* fabric: base colour + diagonal sheen + soft inner shading */
  background:
    linear-gradient(135deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 38%),
    linear-gradient(180deg, color-mix(in srgb, var(--cb-cloth) 88%, #ffffff) 0%, var(--cb-cloth) 30%, color-mix(in srgb, var(--cb-cloth) 82%, #5e4075) 100%);
  /* pennant shape: straight top, notched/pointed bottom */
  clip-path: polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%);
  box-shadow: inset 0 2px 6px rgba(255,255,255,0.5), inset 0 -10px 22px rgba(94,64,117,0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
/* faint woven texture lines */
.cb-cloth-inner::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 5px),
    repeating-linear-gradient(0deg, rgba(94,64,117,0.05) 0 2px, transparent 2px 5px);
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* --- decorations on the cloth --- */
.cb-formula {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(7px, 1vw, 11px);
  letter-spacing: 0.04em;
  color: #5e4075;
  opacity: 0.20;
  white-space: nowrap;
  pointer-events: none;
}
.cb-formula-top { top: 9%; }
.cb-formula-bottom { bottom: 16%; }
.cb-motif {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 66%;
  height: 66%;
  transform: translate(-50%, -50%);
  color: #5e4075;
  opacity: 0.16;
  pointer-events: none;
}

/* --- golden 3D metallic letter --- */
.cb-letter {
  position: relative;
  z-index: 2;
  font-family: var(--font-sans, "Contralto", system-ui, sans-serif);
  font-weight: 700;
  font-size: clamp(26px, 5vw, 62px);
  line-height: 1;
  /* deep plum letters with a light top bevel + soft drop — embossed, on-theme */
  color: #3d2652;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6),
    0 2px 3px rgba(40, 20, 55, 0.28);
}

/* --- idle motion (motion-safe only) ---
   Two layers combine into a cloth-like feel instead of a rigid swing:
   • .cb-swing  → the whole pennant sways from the pinned top (rotate)
   • .cb-cloth-inner → the fabric ripples & twists out of phase (skew + 3D
     rotateY pivoting from the top), at a slightly different tempo so the
     compound motion looks organic, like wind catching cloth. */
@media (prefers-reduced-motion: no-preference) {
  .cb-swing {
    animation: cb-sway var(--cb-dur, 5s) ease-in-out var(--cb-delay, 0s) infinite;
  }
  .cb-cloth-inner {
    transform-origin: top center;
    animation: cb-flutter calc(var(--cb-dur, 5s) * 0.78) ease-in-out
      var(--cb-delay, 0s) infinite;
  }
}
@keyframes cb-sway {
  0%   { transform: rotate(calc(var(--cb-tilt) * -2.4deg)); }
  50%  { transform: rotate(calc(var(--cb-tilt) *  2.4deg)); }
  100% { transform: rotate(calc(var(--cb-tilt) * -2.4deg)); }
}
@keyframes cb-flutter {
  0%   { transform: perspective(620px) rotateY(0deg)  skewX(0deg); }
  28%  { transform: perspective(620px) rotateY(10deg) skewX(2.2deg); }
  55%  { transform: perspective(620px) rotateY(-2deg) skewX(-0.6deg); }
  78%  { transform: perspective(620px) rotateY(-9deg) skewX(-2deg); }
  100% { transform: perspective(620px) rotateY(0deg)  skewX(0deg); }
}

/* --- hover: cloth swings/flows then settles ---
   The idle sway sits on .cb-swing; the hover rotation sits on the parent
   .cb-cloth, so they compose (no property conflict). Pausing the inner sway
   on hover keeps the swing reading cleanly. */
.cb-peg:hover .cb-swing,
.cb-peg:focus-within .cb-swing {
  animation-play-state: paused;
}
.cb-peg:hover .cb-cloth,
.cb-peg:focus-within .cb-cloth {
  transform: rotate(9deg) translateY(-2px);
}

/* Small screens: scale the cloth, letters and pins DOWN so all 9 pennants fit
   in one row without being clipped by the banner's overflow — right down to
   ~320px. (The base clamp floors were too large: 9 x 54px min overflowed a
   phone.) */
@media (max-width: 600px) {
  .cb-cloth  { width: clamp(28px, 8vw, 60px); }
  .cb-letter { font-size: clamp(14px, 4.2vw, 30px); }
  .cb-pin    { width: clamp(6px, 1.6vw, 10px); height: clamp(15px, 4vw, 24px); }
  .cb-formula { opacity: 0.13; }
  .cb-motif { opacity: 0.11; }
  .cb-row { gap: clamp(1px, 0.6vw, 4px); }
}
`;
