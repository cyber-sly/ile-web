"use client";

import { useRef, useState } from "react";
import { Grid2x2, ImageOff, Play } from "lucide-react";

// Desktop: one large photo plus four smaller ones. Phones: a swipeable strip
// with a counter. Any photo opens the lightbox at that index via onOpen(i).
export default function PhotoGallery({ images, title, videoCount = 0, onOpen, onShowVideos }) {
  const [current, setCurrent] = useState(0);
  const stripRef = useRef(null);
  const count = images.length;

  if (count === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-[var(--radius-hero)] bg-line text-ink-muted/60 md:aspect-[21/9]">
        <ImageOff size={48} aria-hidden="true" />
      </div>
    );
  }

  function onScroll() {
    const el = stripRef.current;
    if (el) setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  }

  const extras = (
    <div className="absolute bottom-3 right-3 flex gap-2">
      {videoCount > 0 && (
        <button
          type="button"
          onClick={onShowVideos}
          className="flex h-9 items-center gap-1.5 rounded-full bg-surface/95 px-3.5 text-sm font-semibold text-ink shadow-sm backdrop-blur hover:bg-surface"
        >
          <Play size={14} aria-hidden="true" /> Video
        </button>
      )}
      {count > 1 && (
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="flex h-9 items-center gap-1.5 rounded-full bg-surface/95 px-3.5 text-sm font-semibold text-ink shadow-sm backdrop-blur hover:bg-surface"
        >
          <Grid2x2 size={14} aria-hidden="true" /> All {count} photos
        </button>
      )}
    </div>
  );

  const tiles = images.slice(1, 5);

  return (
    <div className="relative">
      {/* Phones */}
      <div className="relative -mx-4 sm:mx-0 md:hidden">
        <div
          ref={stripRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto sm:rounded-[var(--radius-hero)]"
        >
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`Open photo ${i + 1} of ${count}`}
              className="aspect-[4/3] w-full shrink-0 snap-center"
            >
              <img
                src={url}
                alt={i === 0 ? title : ""}
                loading={i === 0 ? "eager" : "lazy"}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        {count > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white">
            {current + 1} / {count}
          </span>
        )}
        {videoCount > 0 && (
          <div className="absolute bottom-3 right-3">
            <button
              type="button"
              onClick={onShowVideos}
              className="flex h-9 items-center gap-1.5 rounded-full bg-surface/95 px-3.5 text-sm font-semibold text-ink shadow-sm"
            >
              <Play size={14} aria-hidden="true" /> Video
            </button>
          </div>
        )}
      </div>

      {/* Tablet and up */}
      <div
        className={`hidden h-[440px] gap-2 overflow-hidden rounded-[var(--radius-hero)] md:grid lg:h-[500px] ${
          tiles.length === 0 ? "grid-cols-1" : tiles.length === 1 ? "grid-cols-2" : "grid-cols-4 grid-rows-2"
        }`}
      >
        <GalleryTile
          url={images[0]}
          alt={title}
          eager
          onClick={() => onOpen(0)}
          className={tiles.length > 1 ? "col-span-2 row-span-2" : ""}
        />
        {tiles.map((url, i) => (
          <GalleryTile
            key={url}
            url={url}
            alt=""
            onClick={() => onOpen(i + 1)}
            // With 2-3 extra photos, let the last one fill the remaining space.
            className={tiles.length === 2 ? "col-span-2" : tiles.length === 3 && i === 2 ? "col-span-2" : ""}
          />
        ))}
        {extras}
      </div>
    </div>
  );
}

function GalleryTile({ url, alt, onClick, eager = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-0 cursor-zoom-in overflow-hidden bg-line ${className}`}
    >
      <img
        src={url}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className="h-full w-full object-cover transition-[transform,filter] duration-500 group-hover:scale-[1.03] group-hover:brightness-95"
      />
    </button>
  );
}
