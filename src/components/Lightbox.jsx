"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Fullscreen photo viewer. Rendered in a portal on <body>: an animated ancestor's
// transform would otherwise trap position:fixed inside that ancestor.
export default function Lightbox(props) {
  return createPortal(<LightboxInner {...props} />, document.body);
}

function LightboxInner({ images, title, start, onClose }) {
  const [index, setIndex] = useState(start);
  const closeRef = useRef(null);
  const touchX = useRef(null);
  const count = images.length;

  const go = useCallback((delta) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  function onTouchEnd(e) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photo gallery`}
      className="animate-fade-in fixed inset-0 z-[70] flex flex-col bg-ink/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
        <span className="text-sm font-medium text-white/80">
          {index + 1} / {count}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        {count > 1 && (
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:scale-105 hover:bg-white/25 sm:flex"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <img
          key={index}
          src={images[index]}
          alt={`${title} — photo ${index + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="animate-fade-in max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
        {count > 1 && (
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:scale-105 hover:bg-white/25 sm:flex"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {count > 1 && (
        <div
          className="flex justify-center gap-2 overflow-x-auto px-4 py-4"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md transition-all duration-200 ${
                i === index ? "opacity-100 ring-2 ring-white" : "opacity-50 hover:opacity-90"
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
