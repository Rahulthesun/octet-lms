"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChemistryOctetLogo, { getStaticWatermarkCanvas } from "../../components/ui/ChemistryOctetLogo";
import { useIsMobileDevice , usePdfViewerLockdown } from "@/hooks/usePdfViewerLockDown";
import type { LockdownStatus } from "@/hooks/usePdfViewerLockDown"; // add this
import { MobileBlockedScreen } from "../MobileBlockedScreen";

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
  //To Check if Mobile Device Is Being Used to View Notes
  const isMobile = useIsMobileDevice()
  const [status, setStatus] = useState<LockdownStatus>('clean')

  const GRACE_SECONDS = 10 // must match devtoolsGracePeriodMs / 1000
  const [countdown, setCountdown] = useState(GRACE_SECONDS)

  useEffect(() => {
    if (status !== 'devtools-warning') {
      setCountdown(GRACE_SECONDS) // reset when cleared
      return
    }
    if (countdown <= 0) return

    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown])

  // With this:
  usePdfViewerLockdown(containerRef, {
    devtoolsGracePeriodMs: 10000,
    onStatusChange: setStatus,
    onSecurityEvent: (event) => {
      fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/security-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, ts: Date.now() }),
      }).catch(() => {}) // silent — don't crash the viewer on log failure
    },
  })

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
    //e.preventDefault();
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

  // ── Mobile gate ──────────────────────────────────────────────────────────
  // Must come AFTER every hook above — early-returning before a hook runs
  // changes the hook count between renders and breaks the Rules of Hooks.
  if (isMobile === null) return null;       // avoid a flash of content before the check resolves
  if (isMobile) return <MobileBlockedScreen />;

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

        {/* ← toolbar closes here */}

        {/* ── Security status banners ── */}
        {/* ── Warning banner with live countdown ── */}
        {status === 'devtools-warning' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200 shrink-0">
            <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-900">Developer tools detected</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Close them to continue. Session locks in{' '}
                <span className={`font-bold tabular-nums ${countdown <= 3 ? 'text-red-600' : 'text-amber-900'}`}>
                  {countdown}s
                </span>
              </p>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-full border-2 border-amber-300 flex items-center justify-center">
              <span className={`text-xs font-bold tabular-nums ${countdown <= 3 ? 'text-red-500' : 'text-amber-600'}`}>
                {countdown}
              </span>
            </div>
          </div>
        )}

        {/* ── Screenshot logged banner ── */}
        {status === 'screenshot-logged' && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
            <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
            <p className="text-[11px] text-slate-500 flex-1">
              Screenshot attempt detected and logged to this session.
            </p>
          </div>
        )}
        
        {/* ← scroll container starts here */}
        <div 
          ref={scrollContainerRef}
          tabIndex={0}
          role="region"
          aria-label="PDF document"
          className="pdf-scroll-container relative flex-1 overflow-y-auto overflow-x-hidden bg-[#e8e8e8] focus:outline-none"
          onWheel={handleWheel}
          onKeyDown={handleScrollKeyDown}
          onMouseDown={() => scrollContainerRef.current?.focus()}
          onTouchStart={() => scrollContainerRef.current?.focus()}
        >

          {/* ── Hard block overlay — sits above everything ── */}
            {status === 'devtools-blocked' && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-5 max-w-sm text-center px-8">
                  <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-gray-900 tracking-tight">Session suspended</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Developer tools were kept open. This session has been flagged.
                      Contact your instructor to restore access.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-red-400 font-medium tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    Incident recorded
                  </div>
                </div>
              </div>
            )}

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