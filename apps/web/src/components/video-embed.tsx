"use client";

import { useState } from "react";

// Lightweight YouTube embed: shows the thumbnail and only loads the real
// player (privacy-friendly youtube-nocookie domain) when someone clicks play,
// so the homepage stays fast.
export function VideoEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-navy shadow-xl ring-1 ring-line">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={`Play video: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setThumb(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
          />
          <span className="absolute inset-0 bg-ink/25 transition group-hover:bg-ink/10" />
          <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-lg transition group-hover:scale-105 group-hover:bg-accent-hover">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
