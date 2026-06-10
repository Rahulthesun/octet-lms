"use client";

import { useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// PdfViewer — reusable for both admin ContentPage and student lesson pages.
//
// Usage:
//   import { PdfViewer } from "@/components/ui/PdfViewer";
//   <PdfViewer url={pdfUrl} filename="Chapter Notes.pdf" className="h-[60vh]" />
//
// URL construction:
//   Public R2 bucket:  `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${pdf.r2_key}`
//   Private R2 bucket: fetch a presigned URL from your backend first, then pass it here.
// ─────────────────────────────────────────────────────────────────────────────

interface PdfViewerProps {
  /** Full URL to the PDF. Pass null to show the "preview unavailable" state. */
  url: string | null;
  /** Display name shown in the toolbar */
  filename?: string;
  /** Extra Tailwind classes — use to control height, e.g. "h-[60vh]" */
  className?: string;
}

export function PdfViewer({ url, filename, className = "" }: PdfViewerProps) {
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const iframeRef                 = useRef<HTMLIFrameElement>(null);

  // ── No URL: show placeholder ───────────────────────────────────────────────
  if (!url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 ${className}`}
        style={{ minHeight: 320 }}
      >
        <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-6-6z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          />
          <polyline points="9 2 9 8 15 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="18.5" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="text-center">
          <p className="text-sm text-gray-400 font-medium">Preview not available</p>
          <p className="text-xs text-gray-300 mt-1">
            Set <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_R2_PUBLIC_URL</code> to enable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white ${className}`}
      style={{ minHeight: 320 }}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 shrink-0 gap-3">
        {/* File name */}
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 shrink-0 text-red-400" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 1.5A1.5 1.5 0 0 1 4.5 0H10l4 4v10.5A1.5 1.5 0 0 1 12.5 16h-8A1.5 1.5 0 0 1 3 14.5V1.5z"
              stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
            />
            <path d="M10 0v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M5.5 9.5h5M5.5 11.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-gray-700 font-medium truncate">
            {filename ?? "Document"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M8 1h5m0 0v5m0-5L6 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New tab
          </a>
          <a
            href={url}
            download={filename}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download
          </a>
        </div>
      </div>

      {/* ── PDF frame ── */}
      <div className="relative flex-1" style={{ minHeight: 280 }}>

        {/* Loading shimmer */}
        {loading && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 z-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Loading PDF…</span>
          </div>
        )}

        {/* Error state */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50">
            <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
            <p className="text-sm text-gray-500">Could not load PDF</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              Open in new tab →
            </a>
          </div>
        )}

        {/* The actual iframe — browser renders its own PDF controls */}
        {!loadError && (
          <iframe
            ref={iframeRef}
            src={`${url}#toolbar=1&view=FitH`}
            title={filename ?? "PDF Document"}
            className="w-full h-full"
            style={{
              border: "none",
              minHeight: 280,
              display: loading ? "none" : "block",
            }}
            onLoad={() => setLoading(false)}
            onError={() => { setLoadError(true); setLoading(false); }}
          />
        )}
      </div>
    </div>
  );
}