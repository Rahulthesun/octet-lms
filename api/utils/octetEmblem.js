/**
 * utils/octetEmblem.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vector redraw of the Chemistry@OCTET emblem for pdfkit documents — the same
 * geometry and colors as web/components/ui/ChemistryOctetLogo.tsx (purple band
 * with "Chemistry @ OCTET" / "SPREAD TRUE SCIENCE", cream disc, three tilted
 * electron orbits and a red/blue nucleus), frozen in a single static frame.
 * Also holds the copyright line printed on every OCTET report.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COPYRIGHT_NOTICE =
  `© ${new Date().getFullYear()} Chemistry@OCTET. All rights reserved. The OCTET Progress Report format ` +
  "(monthly test-performance and attendance graphs compiled across 12 months) is an original work of " +
  "Chemistry@OCTET and may not be copied, reproduced or adapted without written permission.";

// Logo source geometry (ChemistryOctetLogo.tsx renders on a 440×440 canvas).
const SRC_R_OUT = 208;
const SRC_R_IN = 150;
const SRC_R_ATOM = 150;

// Base (x, y) of each nucleon and its type (0 = proton/red, 1 = neutron/blue),
// taken from the NUCLEONS table of the on-screen logo.
const NUCLEONS = [
  [-10, -5, 0], [7.5, 5, 1], [27.5, 2.5, 1], [-27.5, -2.5, 0], [7.5, 22.5, 0],
  [-7.5, -22.5, 1], [-12.5, 10, 1], [12.5, -10, 0], [15, -17.5, 0], [-15, 17.5, 1],
];

function drawStar(doc, x, y, r, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([x + rr * Math.cos(ang), y + rr * Math.sin(ang)]);
  }
  doc.polygon(...pts).fill(color);
}

/** Places single characters along a circle, centred at `angles[i]` (radians). */
function drawArcChars(doc, text, cx, cy, r, angles, fontSize, rotationOffset) {
  doc.font("Helvetica-Bold").fontSize(fontSize).fillColor("#ffffff");
  for (let i = 0; i < text.length; i++) {
    const ang = angles[i];
    const tx = cx + r * Math.cos(ang);
    const ty = cy + r * Math.sin(ang);
    const w = doc.widthOfString(text[i]);
    doc.save();
    doc.rotate(((ang + rotationOffset) * 180) / Math.PI, { origin: [tx, ty] });
    doc.text(text[i], tx - w / 2, ty - fontSize * 0.36, { lineBreak: false });
    doc.restore();
  }
}

/**
 * Draws the emblem with its centre at (cx, cy) and outer diameter `size` pt.
 * Leaves doc.x / doc.y / fill color exactly as it found them.
 */
function drawOctetEmblem(doc, cx, cy, size) {
  const savedX = doc.x;
  const savedY = doc.y;
  const k = size / 2 / SRC_R_OUT;
  const rOut = SRC_R_OUT * k;
  const rIn = SRC_R_IN * k;
  const rAtom = SRC_R_ATOM * k;
  const rBand = (rIn + rOut) / 2;

  // Band + inner disc
  doc.circle(cx, cy, rOut).fill("#9b8ab8");
  doc.circle(cx, cy, rIn).fill("#f0ede3");
  doc.lineWidth(Math.max(0.4, 2 * k)).strokeOpacity(0.6);
  doc.circle(cx, cy, rOut).stroke("#7a6898");
  doc.circle(cx, cy, rIn).stroke("#7a6898");
  doc.strokeOpacity(1);

  // Band lettering — same angular layout as the canvas logo.
  const PAD = 0.22;
  const halfSpan = Math.PI / 2 - PAD;
  const TOP = -Math.PI / 2;
  const GAP = 0.13;
  const span = halfSpan - GAP;
  const fs = 37 * k;

  drawArcChars(doc, "@", cx, cy, rBand, [TOP], 40 * k, Math.PI / 2);
  const chem = "Chemistry";
  drawArcChars(doc, chem, cx, cy, rBand,
    [...chem].map((_, i) => TOP - GAP - span + (i + 0.5) * (span / chem.length)), fs, Math.PI / 2);
  const octet = "OCTET";
  drawArcChars(doc, octet, cx, cy, rBand,
    [...octet].map((_, i) => TOP + GAP + (i + 0.5) * (span / octet.length)), fs, Math.PI / 2);
  // Bottom text reads left-to-right along the lower arc, so it runs backwards in angle.
  const motto = "SPREAD TRUE SCIENCE";
  const mottoSpan = Math.PI - 2 * PAD;
  drawArcChars(doc, motto, cx, cy, rBand,
    [...motto].map((_, i) => Math.PI / 2 - mottoSpan / 2 + (motto.length - 1 - i + 0.5) * (mottoSpan / motto.length)),
    40 * k * 0.9, -Math.PI / 2);

  drawStar(doc, cx - rBand, cy, 11 * k, "#ffffff");
  drawStar(doc, cx + rBand, cy, 11 * k, "#ffffff");

  // Atom: three tilted orbits with two electrons each.
  const orbitRx = (SRC_R_ATOM - 10) * k;
  const orbitRy = 56 * k;
  const tilts = [0, Math.PI / 3, -Math.PI / 3];
  const electronPhase = [0.6, 2.1, 4.0];
  tilts.forEach((tilt, i) => {
    doc.save();
    doc.rotate((tilt * 180) / Math.PI, { origin: [cx, cy] });
    doc.ellipse(cx, cy, orbitRx, orbitRy).lineWidth(Math.max(0.3, 1.8 * k)).stroke("#b98ae8");
    [electronPhase[i], electronPhase[i] + Math.PI].forEach((t) => {
      doc.circle(cx + orbitRx * Math.cos(t), cy + orbitRy * Math.sin(t), 11 * k).fill("#7a5ca0");
    });
    doc.restore();
  });

  NUCLEONS.forEach(([x, y, type]) => {
    doc.circle(cx + x * k, cy + y * k, 15 * k).fill(type === 0 ? "#cc2040" : "#2040cc");
  });
  // Keep the atom inside the disc edge visually crisp.
  doc.circle(cx, cy, rAtom).lineWidth(Math.max(0.3, 1 * k)).stroke("#7a6898");

  doc.fillColor("black").strokeColor("black").lineWidth(1);
  doc.x = savedX;
  doc.y = savedY;
}

module.exports = { drawOctetEmblem, COPYRIGHT_NOTICE };
