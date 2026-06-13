"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChemistryOctetLogo, { getStaticWatermarkCanvas } from "../../components/ui/ChemistryOctetLogo";

// ─────────────────────────────────────────────────────────────────────────────
// Chemistry@OCTET PdfViewer
// ─────────────────────────────────────────────────────────────────────────────

interface PdfViewerProps {
  url: string | null;
  filename?: string;
  className?: string;
}

// ─── Watermark — drawn directly onto canvas pixels after every page render ────
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, logoCanvas: HTMLCanvasElement | null) {
  // ① Draw Centered 3D Octet Logo Watermark (Alpha controls visibility)
  if (logoCanvas) {
    ctx.save();
    ctx.globalAlpha = 0.12; 
    const size = Math.min(w, h) * 0.65; // 65% of screen width
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 12); // slight tilt looks pro
    ctx.drawImage(logoCanvas, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  const fontSize = Math.max(13, w * 0.028);

  // ② Diagonal tiled text
  ctx.save();
  ctx.globalAlpha = 0.085;
  ctx.fillStyle = "#4B2D8F";
  ctx.font = `bold ${fontSize}px "Inter","Segoe UI",Arial,sans-serif`;
  ctx.textAlign = "center";
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  const stepX = fontSize * 11;
  const stepY = fontSize * 5.5;
  for (let y = -h * 1.5; y < h * 1.5; y += stepY) {
    for (let x = -w * 1.5; x < w * 1.5; x += stepX) {
      ctx.fillText("Chemistry@OCTET", x, y);
    }
  }
  ctx.restore();

  // ③ Footer line
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = "#4B2D8F";
  ctx.font = `${Math.max(9, w * 0.016)}px Arial,sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("© Chemistry@OCTET — For authorised use only", 12, h - 10);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
export function PdfViewer({ url, filename, className = "" }: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [fitScale, setFitScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Buffer to hold the 3D Logo static extraction
  const [watermarkCanvas, setWatermarkCanvas] = useState<HTMLCanvasElement | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Pre-extract static logo canvas ──────────────────────────────────────────
  useEffect(() => {
    getStaticWatermarkCanvas().then(setWatermarkCanvas);
  }, []);

  // ── Compute fit-to-width scale ─────────────────────────────────────────────
  const computeFitScale = useCallback(async (doc: any, pNum: number) => {
    if (!containerRef.current || !doc) return 1.0;
    const cw = containerRef.current.clientWidth;
    if (cw === 0) return 1.0;
    const page = await doc.getPage(pNum);
    const vp = page.getViewport({ scale: 1.0 });
    return Math.max(0.3, Math.min((cw - 40) / vp.width, 4.0));
  }, []);

  // ── Load PDF ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPdfDoc(null);
    setNumPages(0);

    (async () => {
      try {
        const pdfjsLib = (await import("pdfjs-dist")) as any;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;

        if (cancelled) return;

        const fit = await computeFitScale(doc, 1);
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setFitScale(fit);
        setScale(fit); 
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url, computeFitScale]);

  // ── Render current page ────────────────────────────────────────────────────
  useEffect(() => {
    // Only render when the PDF and the watermark snapshot are both ready
    if (!pdfDoc || !containerRef.current || !watermarkCanvas) return;

    let cancelled = false;
    setRendering(true);

    (async () => {
      try {
        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          if (cancelled) return;

          const page = await pdfDoc.getPage(pageNumber);
          const canvas = containerRef.current?.querySelector(`canvas[data-page="${pageNumber}"]`) as HTMLCanvasElement | null;

          if (!canvas) continue;

          const viewport = page.getViewport({ scale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport }).promise;

          if (cancelled) return;

          // Bake it in
          drawWatermark(ctx, viewport.width, viewport.height, watermarkCanvas);
        }
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException" && !cancelled) {
          console.error("Render error:", e);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfDoc, scale, watermarkCanvas]);

  // ── DRM: block shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ["s", "p", "c", "a", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", block, true);
    return () => document.removeEventListener("keydown", block, true);
  }, []);

  // ── Re-compute fit when container is resized ───────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const obs = new ResizeObserver(async () => {
      const fit = await computeFitScale(pdfDoc, 1);
      setFitScale(fit);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [pdfDoc, computeFitScale]);

  // ── Keyboard scroll support ────────────────────────────────────────────────
  const handleScrollKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const pageStep = Math.max(160, container.clientHeight * 0.9);
    const lineStep = 48;

    switch (e.key) {
      case "ArrowDown": container.scrollBy({ top: lineStep, behavior: "auto" }); e.preventDefault(); break;
      case "ArrowUp": container.scrollBy({ top: -lineStep, behavior: "auto" }); e.preventDefault(); break;
      case "PageDown":
      case " ": container.scrollBy({ top: pageStep, behavior: "auto" }); e.preventDefault(); break;
      case "PageUp": container.scrollBy({ top: -pageStep, behavior: "auto" }); e.preventDefault(); break;
      case "Home": container.scrollTo({ top: 0, behavior: "auto" }); e.preventDefault(); break;
      case "End": container.scrollTo({ top: container.scrollHeight, behavior: "auto" }); e.preventDefault(); break;
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX) && e.deltaX === 0) return;
    container.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "auto" });
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!url) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const focusTimer = window.setTimeout(() => container.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [url, loading]);

  const zoomIn = () => setScale((s) => Math.min(+(s * 1.25).toFixed(3), 4.0));
  const zoomOut = () => setScale((s) => Math.max(+(s / 1.25).toFixed(3), 0.25));
  const zoomFit = () => setScale(fitScale);
  const scalePct = Math.round(scale * 100);

  if (!url) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 ${className}`} style={{ minHeight: 320 }}>
        {/* Your live component looks sick as an empty state */}
        <ChemistryOctetLogo size={64} className="opacity-40 grayscale" />
        <div className="text-center mt-2">
          <p className="text-sm font-semibold text-primary/40 tracking-tight">Chemistry<span className="font-normal text-gray-300">@</span>OCTET</p>
          <p className="text-xs text-gray-400 mt-1">Preview not available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@media print { .cato-pdf-viewer { display: none !important; } }`}</style>
      <style>{`
        .pdf-scroll-container {
          scroll-behavior: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-gutter: stable;
          touch-action: pan-x pan-y;
        }
        .pdf-scroll-container::-webkit-scrollbar { width: 8px; height: 8px; }
        .pdf-scroll-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .pdf-scroll-container::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .pdf-scroll-container::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
      `}</style>

      <div className={`cato-pdf-viewer flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white select-none focus:outline-none ${className}`} style={{ minHeight: 380 }} onContextMenu={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-gray-100 shrink-0">
            {/* Live micro-logo in the toolbar */}
            <ChemistryOctetLogo size={20} />
            <span className="text-[11px] font-extrabold text-primary tracking-tight leading-none ml-1">
              C<span className="font-light text-gray-400">@</span>O
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs text-gray-500 truncate">{filename ?? "Document"}</span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 border-l border-gray-100 pl-2">
            <button onClick={zoomOut} disabled={scale <= 0.25 || loading} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <span className="text-[11px] text-gray-500 tabular-nums w-10 text-center">{loading ? "—" : `${scalePct}%`}</span>
            <button onClick={zoomIn} disabled={scale >= 4.0 || loading} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <button onClick={zoomFit} disabled={loading} className="text-[11px] text-gray-400 hover:text-primary px-2 h-6 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 ml-0.5">Fit</button>
          </div>

          <div className="shrink-0 ml-1 flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-full px-2 py-0.5">
            <span className="text-[9px] font-semibold text-primary/50 tracking-wider uppercase leading-none">Protected</span>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          tabIndex={0}
          role="region"
          aria-label="PDF document"
          className="pdf-scroll-container flex-1 overflow-y-auto overflow-x-hidden bg-[#e8e8e8] focus:outline-none"
          onWheel={handleWheel}
          onKeyDown={handleScrollKeyDown}
          onMouseDown={() => scrollContainerRef.current?.focus()}
          onTouchStart={() => scrollContainerRef.current?.focus()}
        >
          <div ref={containerRef} className="flex flex-col items-center py-5 gap-1">
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 flex-1">
                <div className="relative">
                  {/* Your animated logo doubles perfectly as a loading spinner */}
                  <ChemistryOctetLogo size={48} />
                  <div className="absolute -inset-2 flex items-center justify-center">
                    <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                </div>
                <span className="text-xs text-gray-400 mt-4">Loading document…</span>
              </div>
            )}

            {loadError && !loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 flex-1">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Could not load PDF</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-48 text-center">{loadError}</p>
                </div>
              </div>
            )}

            <div className="w-full flex flex-col items-center gap-4">
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i + 1} className="relative shadow-2xl rounded-sm">
                  <canvas data-page={i + 1} className="block rounded-sm" style={{ display: "block", maxWidth: "100%", pointerEvents: "none" }} />
                </div>
              ))}
            </div>

            {!loading && !loadError && (
              <div className="flex items-center gap-1.5 mt-2 opacity-40">
                <ChemistryOctetLogo size={16} className="grayscale" />
                <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                  Chemistry@OCTET — Secured Content
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}