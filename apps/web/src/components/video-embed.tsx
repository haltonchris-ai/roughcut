"use client";

import { useRef, useState } from "react";

// Self-hosted demo player: poster + big play button, then native controls.
// No third-party branding or tracking. Files live in /public/demo.
export function VideoEmbed({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string;
  title: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function start() {
    setStarted(true);
    const v = ref.current;
    if (v) void v.play().catch(() => {});
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-line bg-ink shadow-lg"
      style={{ aspectRatio: "1792 / 512" }}
    >
      <video
        ref={ref}
        className="h-full w-full object-cover"
        src={src}
        poster={poster}
        title={title}
        preload="metadata"
        playsInline
        controls={started}
        onEnded={() => setStarted(false)}
      />
      {!started && (
        <button
          type="button"
          onClick={start}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 flex items-center justify-center bg-ink/25 transition hover:bg-ink/35"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-xl transition group-hover:scale-105 group-hover:bg-accent-hover sm:h-20 sm:w-20">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 sm:h-9 sm:w-9" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
