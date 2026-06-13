"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Chemistry@OCTET PdfViewer
//
// Uses PDF.js canvas rendering — NOT a native browser iframe.
// This means:
//   • Watermark is baked directly into every rendered page canvas
//   • Right-click, text-select, Ctrl+S/P/C are all blocked
//   • The PDF is hidden from print via CSS
//   • Auto-fits to container width on load, with manual zoom controls
//
// ── Setup ─────────────────────────────────────────────────────────────────────
//   npm install pdfjs-dist
//
// ── .env.local ────────────────────────────────────────────────────────────────
//   NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxx.r2.dev
//
// ── Student usage ─────────────────────────────────────────────────────────────
//   import { PdfViewer } from "@/components/ui/PdfViewer";
//   <PdfViewer url={pdfUrl} filename="Chapter 3 Notes.pdf" className="h-[70vh]" />
// ─────────────────────────────────────────────────────────────────────────────

interface PdfViewerProps {
  /** Full URL to the PDF. Null → shows branded empty state. */
  url: string | null;
  /** Shown in the toolbar beside the file icon. */
  filename?: string;
  /** Control height from outside: e.g. className="h-[60vh]" */
  className?: string;
}

// ─── Atom brand icon ──────────────────────────────────────────────────────────
function AtomIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="3.5"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="3.5"
        stroke="currentColor"
        strokeWidth="1.35"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="3.5"
        stroke="currentColor"
        strokeWidth="1.35"
        transform="rotate(-60 12 12)"
      />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
    </svg>
  );
}

// ─── Watermark — drawn directly onto canvas pixels after every page render ────
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fontSize = Math.max(13, w * 0.028);

  // ① Diagonal tiled text
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

  // ② Footer line
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

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

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

        const doc = await pdfjsLib.getDocument({ url, withCredentials: false })
          .promise;

        if (cancelled) return;

        const fit = await computeFitScale(doc, 1);
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setFitScale(fit);
        setScale(fit); // auto-fit to width on first load
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, computeFitScale]);

  // ── Render current page ────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    let cancelled = false;
    setRendering(true);

    (async () => {
      try {
        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          if (cancelled) return;

          const page = await pdfDoc.getPage(pageNumber);

          const canvas = containerRef.current?.querySelector(
            `canvas[data-page="${pageNumber}"]`,
          ) as HTMLCanvasElement | null;

          if (!canvas) continue;

          const viewport = page.getViewport({ scale });

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({
            canvasContext: ctx,
            viewport,
          }).promise;

          if (cancelled) return;

          drawWatermark(ctx, viewport.width, viewport.height);
        }
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException" && !cancelled) {
          console.error("Render error:", e);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, scale]);

  // ── DRM: block Ctrl+S / Ctrl+P / Ctrl+C / Ctrl+A ──────────────────────────
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
  const handleScrollKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const pageStep = Math.max(160, container.clientHeight * 0.9);
      const lineStep = 48;

      switch (e.key) {
        case "ArrowDown":
          container.scrollBy({ top: lineStep, behavior: "auto" });
          e.preventDefault();
          break;
        case "ArrowUp":
          container.scrollBy({ top: -lineStep, behavior: "auto" });
          e.preventDefault();
          break;
        case "PageDown":
        case " ":
          container.scrollBy({ top: pageStep, behavior: "auto" });
          e.preventDefault();
          break;
        case "PageUp":
          container.scrollBy({ top: -pageStep, behavior: "auto" });
          e.preventDefault();
          break;
        case "Home":
          container.scrollTo({ top: 0, behavior: "auto" });
          e.preventDefault();
          break;
        case "End":
          container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
          e.preventDefault();
          break;
        default:
          break;
      }
    },
    [],
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (Math.abs(e.deltaY) < Math.abs(e.deltaX) && e.deltaX === 0) {
      return;
    }

    container.scrollBy({
      top: e.deltaY,
      left: e.deltaX,
      behavior: "auto",
    });
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!url) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const focusTimer = window.setTimeout(() => container.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [url, loading]);

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  const zoomIn = () => setScale((s) => Math.min(+(s * 1.25).toFixed(3), 4.0));
  const zoomOut = () => setScale((s) => Math.max(+(s / 1.25).toFixed(3), 0.25));
  const zoomFit = () => setScale(fitScale);
  const scalePct = Math.round(scale * 100);

  // ── No URL: branded placeholder ────────────────────────────────────────────
  if (!url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 ${className}`}
        style={{ minHeight: 320 }}
      >
        <AtomIcon className="w-10 h-10 text-primary/20" />
        <div className="text-center">
          <p className="text-sm font-semibold text-primary/40 tracking-tight">
            Chemistry<span className="font-normal text-gray-300">@</span>OCTET
          </p>
          <p className="text-xs text-gray-400 mt-1">Preview not available</p>
          <p className="text-xs text-gray-300 mt-0.5">
            Set{" "}
            <code className="bg-gray-100 px-1 rounded">
              NEXT_PUBLIC_R2_PUBLIC_URL
            </code>
          </p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* DRM: hide entire viewer on print */}
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

        .pdf-scroll-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .pdf-scroll-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .pdf-scroll-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        .pdf-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>

      <div
        className={`cato-pdf-viewer flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white select-none focus:outline-none ${className}`}
        style={{ minHeight: 380 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* ── Branded toolbar ── */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shrink-0">
          {/* Chemistry@OCTET brand mark */}
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-gray-100 shrink-0">
            <AtomIcon className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-extrabold text-primary tracking-tight leading-none">
              C<span className="font-light text-gray-400">@</span>O
            </span>
          </div>

          {/* Filename */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <svg
              className="w-3.5 h-3.5 text-red-400 shrink-0"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M2.5 1A1.5 1.5 0 0 1 4 0h5.5l3 3V13A1.5 1.5 0 0 1 11 14.5H4A1.5 1.5 0 0 1 2.5 13V1z"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 0v3h3"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <path
                d="M5 7.5h4M5 9.5h2.5"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-xs text-gray-500 truncate">
              {filename ?? "Document"}
            </span>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 shrink-0 border-l border-gray-100 pl-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.25 || loading}
              aria-label="Zoom out"
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="text-[11px] text-gray-500 tabular-nums w-10 text-center">
              {loading ? "—" : `${scalePct}%`}
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 4.0 || loading}
              aria-label="Zoom in"
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
                <path
                  d="M5 2v6M2 5h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              onClick={zoomFit}
              disabled={loading}
              aria-label="Fit to width"
              title="Fit to width"
              className="text-[11px] text-gray-400 hover:text-primary px-2 h-6 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 ml-0.5"
            >
              Fit
            </button>
          </div>

          {/* DRM badge */}
          <div className="shrink-0 ml-1 flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-full px-2 py-0.5">
            <svg
              className="w-2.5 h-2.5 text-primary/60"
              viewBox="0 0 10 10"
              fill="currentColor"
            >
              <path d="M5 0L1 2v3c0 2.2 1.7 4.3 4 4.9C8.3 9.3 10 7.2 10 5V2L5 0zm0 4.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm.5 2.8h-1V6h1v1.3z" />
            </svg>
            <span className="text-[9px] font-semibold text-primary/50 tracking-wider uppercase leading-none">
              Protected
            </span>
          </div>
        </div>

        {/* ── Canvas scroll area ── */}
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          role="region"
          aria-label="PDF document"
          className="pdf-scroll-container flex-1 overflow-y-auto overflow-x-hidden bg-[#e8e8e8] focus:outline-none"
          style={{
            minHeight: 0,
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            scrollbarGutter: "stable",
          }}
          onWheel={handleWheel}
          onKeyDown={handleScrollKeyDown}
          onMouseDown={() => scrollContainerRef.current?.focus()}
          onTouchStart={() => scrollContainerRef.current?.focus()}
        >
          <div
            ref={containerRef}
            className="flex flex-col items-center py-5 gap-1"
          >
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 flex-1">
                <div className="relative">
                  <AtomIcon className="w-8 h-8 text-primary/20 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  Loading document…
                </span>
              </div>
            )}

            {/* Error state */}
            {loadError && !loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 flex-1">
                <svg
                  className="w-10 h-10 text-gray-300"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="12"
                    y1="9"
                    x2="12"
                    y2="13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="17" r="1" fill="currentColor" />
                </svg>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Could not load PDF</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-48 text-center">
                    {loadError}
                  </p>
                </div>
              </div>
            )}

            {/* PDF canvas */}
            <div className="w-full flex flex-col items-center gap-4">
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i + 1} className="relative shadow-2xl rounded-sm">
                  <canvas
                    data-page={i + 1}
                    className="block rounded-sm"
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Bottom brand watermark strip */}
            {!loading && !loadError && (
              <div className="flex items-center gap-1.5 mt-2 opacity-40">
                <AtomIcon className="w-3 h-3 text-gray-500" />
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
