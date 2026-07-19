"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type VideoPreviewPlayerProps = {
  src: string;
  title: string;
  mimeType?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function PlayIcon() {
  return <path d="M8 5.5 18 12 8 18.5V5.5Z" fill="currentColor" />;
}

/** A consistent, reusable playback UI for admin video previews. */
export function VideoPreviewPlayer({
  src,
  title,
  mimeType,
}: VideoPreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        // Browsers can reject playback until the user interacts with the page.
      }
    } else {
      video.pause();
    }
  }

  function seek(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }

  function changeVolume(nextVolume: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  }

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen();
    }
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden bg-black text-white"
      style={{ fontFamily: "var(--font-inter), Arial, sans-serif" }}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        preload="metadata"
        playsInline
        aria-label={`Preview of ${title}`}
        onClick={togglePlayback}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      >
        <source src={src} type={mimeType || undefined} />
        Your browser does not support video playback.
      </video>

      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlayback}
          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:scale-105 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          aria-label="Play video"
        >
          <svg className="ml-0.5 h-7 w-7" viewBox="0 0 24 24" aria-hidden="true">
            <PlayIcon />
          </svg>
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Video progress"
          className="video-preview-range mb-2 block w-full cursor-pointer"
          style={{ "--progress": `${progress}%` } as CSSProperties}
        />
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={togglePlayback}
            className="rounded p-1 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              {isPlaying ? (
                <path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" fill="currentColor" />
              ) : (
                <PlayIcon />
              )}
            </svg>
          </button>
          <span className="min-w-20 text-xs tabular-nums text-white/90">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={() => changeVolume(isMuted ? volume || 0.7 : 0)}
            className="rounded p-1 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 10v4h4l5 4V6l-5 4H4Z" fill="currentColor" />
              {isMuted || volume === 0 ? (
                <path d="m16 10 4 4m0-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M16 9.5a4 4 0 0 1 0 5m2.5-7.5a7.5 7.5 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            aria-label="Volume"
            className="video-preview-range hidden w-20 cursor-pointer sm:block"
            style={{ "--progress": `${(isMuted ? 0 : volume) * 100}%` } as CSSProperties}
          />
          <button
            type="button"
            onClick={toggleFullscreen}
            className="ml-auto rounded p-1 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Toggle fullscreen"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        .video-preview-range {
          --progress: 0%;
          appearance: none;
          height: 4px;
          border-radius: 9999px;
          background: linear-gradient(to right, #ffffff var(--progress), rgb(255 255 255 / 0.35) var(--progress));
        }
        .video-preview-range::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: #ffffff;
        }
        .video-preview-range::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border: 0;
          border-radius: 9999px;
          background: #ffffff;
        }
      `}</style>
    </div>
  );
}
