"use client";

/**
 * PeriodicTable.tsx
 * ------------------------------------------------------------------------
 * A subtle, interactive periodic table for the landing page — themed to the
 * site's soft cream + plum pastel palette.
 *
 * Behaviour
 *  • Cells are quiet monochrome plum by default; an element's CATEGORY COLOUR
 *    reveals on hover (with a gentle lift + glow).
 *  • Hovering (or focusing) a cell reveals its category colour and fills the
 *    top-left detail panel with the element's name, number, mass and category.
 *  • Elements fade/scale in with a staggered SCROLL-IN reveal (motion-safe;
 *    respects prefers-reduced-motion).
 *  • The table sizes itself to its CONTAINER's width (container-query units),
 *    so it fits neatly into a half-width column beside other content.
 *
 * 'use client' is required for the IntersectionObserver reveal and the hover
 * detail state. No external dependencies. The <style> block is embedded so
 * the file is self-contained — move it to globals.css if you prefer.
 *
 * Usage:
 *     import PeriodicTable from "@/components/PeriodicTable";
 *     <PeriodicTable />
 * ------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

/* ---- categories (muted, tasteful tones; only shown on hover/highlight) -- */
const CATS = {
  alkali:     { label: "Alkali metal",          color: "#C98A9B" },
  alkaline:   { label: "Alkaline earth metal",   color: "#D8A978" },
  transition: { label: "Transition metal",       color: "#9C8AB8" },
  post:       { label: "Post-transition metal",  color: "#8FB0A6" },
  metalloid:  { label: "Metalloid",              color: "#C2A878" },
  nonmetal:   { label: "Reactive nonmetal",      color: "#8AA9C9" },
  halogen:    { label: "Halogen",                color: "#7FB7B0" },
  noble:      { label: "Noble gas",              color: "#B79CD0" },
  lanthanide: { label: "Lanthanide",             color: "#C58FB0" },
  actinide:   { label: "Actinide",               color: "#B493A6" },
} as const;

type CatKey = keyof typeof CATS;

/** [number, symbol, name, atomic mass, category, group(x 1-18), period(y)] */
type El = [number, string, string, string, CatKey, number, number];

const ELEMENTS: El[] = [
  [1, "H", "Hydrogen", "1.008", "nonmetal", 1, 1],
  [2, "He", "Helium", "4.003", "noble", 18, 1],
  [3, "Li", "Lithium", "6.94", "alkali", 1, 2],
  [4, "Be", "Beryllium", "9.012", "alkaline", 2, 2],
  [5, "B", "Boron", "10.81", "metalloid", 13, 2],
  [6, "C", "Carbon", "12.011", "nonmetal", 14, 2],
  [7, "N", "Nitrogen", "14.007", "nonmetal", 15, 2],
  [8, "O", "Oxygen", "15.999", "nonmetal", 16, 2],
  [9, "F", "Fluorine", "18.998", "halogen", 17, 2],
  [10, "Ne", "Neon", "20.180", "noble", 18, 2],
  [11, "Na", "Sodium", "22.990", "alkali", 1, 3],
  [12, "Mg", "Magnesium", "24.305", "alkaline", 2, 3],
  [13, "Al", "Aluminium", "26.982", "post", 13, 3],
  [14, "Si", "Silicon", "28.085", "metalloid", 14, 3],
  [15, "P", "Phosphorus", "30.974", "nonmetal", 15, 3],
  [16, "S", "Sulfur", "32.06", "nonmetal", 16, 3],
  [17, "Cl", "Chlorine", "35.45", "halogen", 17, 3],
  [18, "Ar", "Argon", "39.948", "noble", 18, 3],
  [19, "K", "Potassium", "39.098", "alkali", 1, 4],
  [20, "Ca", "Calcium", "40.078", "alkaline", 2, 4],
  [21, "Sc", "Scandium", "44.956", "transition", 3, 4],
  [22, "Ti", "Titanium", "47.867", "transition", 4, 4],
  [23, "V", "Vanadium", "50.942", "transition", 5, 4],
  [24, "Cr", "Chromium", "51.996", "transition", 6, 4],
  [25, "Mn", "Manganese", "54.938", "transition", 7, 4],
  [26, "Fe", "Iron", "55.845", "transition", 8, 4],
  [27, "Co", "Cobalt", "58.933", "transition", 9, 4],
  [28, "Ni", "Nickel", "58.693", "transition", 10, 4],
  [29, "Cu", "Copper", "63.546", "transition", 11, 4],
  [30, "Zn", "Zinc", "65.38", "transition", 12, 4],
  [31, "Ga", "Gallium", "69.723", "post", 13, 4],
  [32, "Ge", "Germanium", "72.630", "metalloid", 14, 4],
  [33, "As", "Arsenic", "74.922", "metalloid", 15, 4],
  [34, "Se", "Selenium", "78.971", "nonmetal", 16, 4],
  [35, "Br", "Bromine", "79.904", "halogen", 17, 4],
  [36, "Kr", "Krypton", "83.798", "noble", 18, 4],
  [37, "Rb", "Rubidium", "85.468", "alkali", 1, 5],
  [38, "Sr", "Strontium", "87.62", "alkaline", 2, 5],
  [39, "Y", "Yttrium", "88.906", "transition", 3, 5],
  [40, "Zr", "Zirconium", "91.224", "transition", 4, 5],
  [41, "Nb", "Niobium", "92.906", "transition", 5, 5],
  [42, "Mo", "Molybdenum", "95.95", "transition", 6, 5],
  [43, "Tc", "Technetium", "(98)", "transition", 7, 5],
  [44, "Ru", "Ruthenium", "101.07", "transition", 8, 5],
  [45, "Rh", "Rhodium", "102.91", "transition", 9, 5],
  [46, "Pd", "Palladium", "106.42", "transition", 10, 5],
  [47, "Ag", "Silver", "107.87", "transition", 11, 5],
  [48, "Cd", "Cadmium", "112.41", "transition", 12, 5],
  [49, "In", "Indium", "114.82", "post", 13, 5],
  [50, "Sn", "Tin", "118.71", "post", 14, 5],
  [51, "Sb", "Antimony", "121.76", "metalloid", 15, 5],
  [52, "Te", "Tellurium", "127.60", "metalloid", 16, 5],
  [53, "I", "Iodine", "126.90", "halogen", 17, 5],
  [54, "Xe", "Xenon", "131.29", "noble", 18, 5],
  [55, "Cs", "Caesium", "132.91", "alkali", 1, 6],
  [56, "Ba", "Barium", "137.33", "alkaline", 2, 6],
  [57, "La", "Lanthanum", "138.91", "lanthanide", 3, 9],
  [58, "Ce", "Cerium", "140.12", "lanthanide", 4, 9],
  [59, "Pr", "Praseodymium", "140.91", "lanthanide", 5, 9],
  [60, "Nd", "Neodymium", "144.24", "lanthanide", 6, 9],
  [61, "Pm", "Promethium", "(145)", "lanthanide", 7, 9],
  [62, "Sm", "Samarium", "150.36", "lanthanide", 8, 9],
  [63, "Eu", "Europium", "151.96", "lanthanide", 9, 9],
  [64, "Gd", "Gadolinium", "157.25", "lanthanide", 10, 9],
  [65, "Tb", "Terbium", "158.93", "lanthanide", 11, 9],
  [66, "Dy", "Dysprosium", "162.50", "lanthanide", 12, 9],
  [67, "Ho", "Holmium", "164.93", "lanthanide", 13, 9],
  [68, "Er", "Erbium", "167.26", "lanthanide", 14, 9],
  [69, "Tm", "Thulium", "168.93", "lanthanide", 15, 9],
  [70, "Yb", "Ytterbium", "173.05", "lanthanide", 16, 9],
  [71, "Lu", "Lutetium", "174.97", "lanthanide", 17, 9],
  [72, "Hf", "Hafnium", "178.49", "transition", 4, 6],
  [73, "Ta", "Tantalum", "180.95", "transition", 5, 6],
  [74, "W", "Tungsten", "183.84", "transition", 6, 6],
  [75, "Re", "Rhenium", "186.21", "transition", 7, 6],
  [76, "Os", "Osmium", "190.23", "transition", 8, 6],
  [77, "Ir", "Iridium", "192.22", "transition", 9, 6],
  [78, "Pt", "Platinum", "195.08", "transition", 10, 6],
  [79, "Au", "Gold", "196.97", "transition", 11, 6],
  [80, "Hg", "Mercury", "200.59", "transition", 12, 6],
  [81, "Tl", "Thallium", "204.38", "post", 13, 6],
  [82, "Pb", "Lead", "207.2", "post", 14, 6],
  [83, "Bi", "Bismuth", "208.98", "post", 15, 6],
  [84, "Po", "Polonium", "(209)", "post", 16, 6],
  [85, "At", "Astatine", "(210)", "halogen", 17, 6],
  [86, "Rn", "Radon", "(222)", "noble", 18, 6],
  [87, "Fr", "Francium", "(223)", "alkali", 1, 7],
  [88, "Ra", "Radium", "(226)", "alkaline", 2, 7],
  [89, "Ac", "Actinium", "(227)", "actinide", 3, 10],
  [90, "Th", "Thorium", "232.04", "actinide", 4, 10],
  [91, "Pa", "Protactinium", "231.04", "actinide", 5, 10],
  [92, "U", "Uranium", "238.03", "actinide", 6, 10],
  [93, "Np", "Neptunium", "(237)", "actinide", 7, 10],
  [94, "Pu", "Plutonium", "(244)", "actinide", 8, 10],
  [95, "Am", "Americium", "(243)", "actinide", 9, 10],
  [96, "Cm", "Curium", "(247)", "actinide", 10, 10],
  [97, "Bk", "Berkelium", "(247)", "actinide", 11, 10],
  [98, "Cf", "Californium", "(251)", "actinide", 12, 10],
  [99, "Es", "Einsteinium", "(252)", "actinide", 13, 10],
  [100, "Fm", "Fermium", "(257)", "actinide", 14, 10],
  [101, "Md", "Mendelevium", "(258)", "actinide", 15, 10],
  [102, "No", "Nobelium", "(259)", "actinide", 16, 10],
  [103, "Lr", "Lawrencium", "(266)", "actinide", 17, 10],
  [104, "Rf", "Rutherfordium", "(267)", "transition", 4, 7],
  [105, "Db", "Dubnium", "(268)", "transition", 5, 7],
  [106, "Sg", "Seaborgium", "(269)", "transition", 6, 7],
  [107, "Bh", "Bohrium", "(270)", "transition", 7, 7],
  [108, "Hs", "Hassium", "(269)", "transition", 8, 7],
  [109, "Mt", "Meitnerium", "(278)", "transition", 9, 7],
  [110, "Ds", "Darmstadtium", "(281)", "transition", 10, 7],
  [111, "Rg", "Roentgenium", "(282)", "transition", 11, 7],
  [112, "Cn", "Copernicium", "(285)", "transition", 12, 7],
  [113, "Nh", "Nihonium", "(286)", "post", 13, 7],
  [114, "Fl", "Flerovium", "(289)", "post", 14, 7],
  [115, "Mc", "Moscovium", "(290)", "post", 15, 7],
  [116, "Lv", "Livermorium", "(293)", "post", 16, 7],
  [117, "Ts", "Tennessine", "(294)", "halogen", 17, 7],
  [118, "Og", "Oganesson", "(294)", "noble", 18, 7],
];

export default function PeriodicTable({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [hovered, setHovered] = useState<El | null>(null);

  // Staggered scroll-in reveal: flip `revealed` once the table enters view.
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const hv = hovered ? CATS[hovered[4]] : null;

  return (
    <div className={`pt-shell ${className}`}>
      <style>{STYLES}</style>

      <div
        ref={wrapRef}
        className="pt-wrap"
        data-revealed={revealed ? "true" : "false"}
      >
        <div
          className="pt-grid"
          role="table"
          aria-label="Periodic table of the elements"
        >
          {/* detail panel — fills the empty top-left gap and updates on hover */}
          <div
            className="pt-panel"
            style={{ gridColumn: "3 / 13", gridRow: "1 / 4" } as CSSProperties}
            aria-live="polite"
          >
            {hovered && hv ? (
              <div className="pt-panel-card" style={{ "--cat": hv.color } as CSSProperties}>
                <span className="pt-panel-sym">{hovered[1]}</span>
                <span className="pt-panel-info">
                  <span className="pt-panel-num">No. {hovered[0]}</span>
                  <span className="pt-panel-name">{hovered[2]}</span>
                  <span className="pt-panel-meta">{hovered[3]} u</span>
                  <span className="pt-panel-pill">{hv.label}</span>
                </span>
              </div>
            ) : (
              <span className="pt-panel-hint">
              </span>
            )}
          </div>

          {ELEMENTS.map((el, i) => {
            const [num, sym, name, , cat, x, y] = el;
            const meta = CATS[cat];
            const style = {
              gridColumn: x,
              gridRow: y,
              "--cat": meta.color,
              "--i": i,
            } as CSSProperties;
            return (
              <div
                key={num}
                className="pt-cell"
                style={style}
                tabIndex={0}
                role="cell"
                aria-label={`${name}, symbol ${sym}, atomic number ${num}, ${meta.label}`}
                onMouseEnter={() => setHovered(el)}
                onMouseLeave={() => setHovered((cur) => (cur === el ? null : cur))}
                onFocus={() => setHovered(el)}
                onBlur={() => setHovered((cur) => (cur === el ? null : cur))}
              >
                <div className="pt-cell-inner">
                  <span className="pt-num">{num}</span>
                  <span className="pt-sym">{sym}</span>
                </div>
              </div>
            );
          })}

          {/* f-block markers linking the main table to the rows below */}
          <div className="pt-marker" style={{ gridColumn: 3, gridRow: 6 } as CSSProperties}>
            57–71
          </div>
          <div className="pt-marker" style={{ gridColumn: 3, gridRow: 7 } as CSSProperties}>
            89–103
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- styles (self-contained; move to globals.css if preferred) --------- */

const STYLES = `
.pt-shell {
  container-type: inline-size;
  width: 100%;
  display: flex;
  justify-content: center;
  color: var(--color-primary, #5e4075);
}

.pt-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* --- the grid: cells scale to the shell's WIDTH via container units, so the
       table fits whatever column it is dropped into. Change --cell to resize:
       the max (42px) caps cell size, the middle (5.05cqw) is the
       width-proportional size, the min (13px) is the smallest it may shrink. --- */
.pt-grid {
  --cell: clamp(14px, 5.4cqw, 46px);
  --rh: calc(var(--cell) * 1.06);
  display: grid;
  grid-template-columns: repeat(18, var(--cell));
  grid-template-rows: repeat(7, var(--rh)) calc(var(--rh) * 0.5) repeat(2, var(--rh));
  gap: 0;
  width: max-content;
  margin: 0 auto;
}

/* --- cell: outer handles the staggered reveal --- */
.pt-cell { position: relative; }

@media (prefers-reduced-motion: no-preference) {
  .pt-cell {
    transition: opacity 0.45s ease, transform 0.45s ease, filter 0.25s ease;
    transition-delay: calc(var(--i) * 4ms);
  }
  .pt-wrap[data-revealed="false"] .pt-cell {
    opacity: 0;
    transform: translateY(10px) scale(0.92);
  }
}

.pt-cell:hover, .pt-cell:focus-visible { z-index: 6; outline: none; }

/* --- inner: pastel by default; brightens on hover / when its legend is active --- */
.pt-cell-inner {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(94, 64, 117, 0.12);
  /* soft pastel tint of the family colour */
  background: color-mix(in srgb, var(--cat) 30%, #ffffff);
  color: var(--color-primary, #5e4075);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease,
    background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.pt-cell:hover .pt-cell-inner,
.pt-cell:focus-visible .pt-cell-inner {
  transform: scale(1.16);
  background: var(--cat);
  border-color: color-mix(in srgb, var(--cat) 60%, #3a2b4d);
  color: #fff;
  box-shadow: 0 8px 18px -6px color-mix(in srgb, var(--cat) 70%, transparent);
}
.pt-num {
  position: absolute;
  top: calc(var(--cell) * 0.08);
  left: calc(var(--cell) * 0.11);
  font-family: var(--font-mono, ui-monospace, monospace);
  /* sized relative to the cell so it always leaves a margin */
  font-size: calc(var(--cell) * 0.2);
  line-height: 1;
  opacity: 0.6;
}
.pt-sym {
  font-family: var(--font-sans, "Contralto", system-ui, sans-serif);
  font-weight: 700;
  /* ~40% of the cell keeps clear space on every side */
  font-size: calc(var(--cell) * 0.4);
  line-height: 1;
}

/* --- f-block link markers --- */
.pt-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-border, #c8b8d8);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(6px, 1.6cqw, 9px);
  color: var(--color-muted, #8b6fa0);
  background: rgba(212, 197, 226, 0.12);
}

/* --- detail panel (replaces the tooltip), sits in the empty top-left gap --- */
.pt-panel {
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 2px clamp(4px, 1.4cqw, 14px);
}
.pt-panel-hint {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(10px, 2.4cqw, 15px);
  color: var(--color-muted, #8b6fa0);
  opacity: 0.85;
}
.pt-panel-card {
  display: flex;
  align-items: center;
  gap: clamp(8px, 2cqw, 20px);
  width: 100%;
  height: 100%;
  padding-left: 4px;
}
.pt-panel-sym {
  font-family: var(--font-sans, "Contralto", system-ui, sans-serif);
  font-weight: 700;
  font-size: clamp(26px, 9cqw, 66px);
  line-height: 0.9;
  color: var(--cat);
}
.pt-panel-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pt-panel-num {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(9px, 1.8cqw, 13px);
  color: var(--color-muted, #8b6fa0);
}
.pt-panel-name {
  font-family: var(--font-sans, "Contralto", system-ui, sans-serif);
  font-size: clamp(14px, 3.4cqw, 26px);
  line-height: 1.05;
  color: var(--color-primary, #5e4075);
}
.pt-panel-meta {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(9px, 1.8cqw, 13px);
  color: var(--color-muted, #8b6fa0);
}
.pt-panel-pill {
  align-self: flex-start;
  margin-top: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--cat);
  color: #fff;
  font-size: clamp(9px, 1.6cqw, 12px);
  letter-spacing: 0.02em;
}
`;
