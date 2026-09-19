"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

// Swap these two files in /public/videos to change the hero footage.
const VIDEO_SRC = "/videos/hero.mp4";
const POSTER_SRC = "/videos/hero-poster.jpg";

const TEXT_SHADOW = { textShadow: "0 2px 28px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.55)" };
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export default function VideoHero() {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  const [videoReady, setVideoReady] = useState(false);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  // Don't burn battery/CPU decoding video nobody can see.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <section
      ref={sectionRef}
      aria-label="Introduction"
      className="relative isolate flex h-[calc(100svh-65px)] max-h-[860px] min-h-[540px] items-center justify-center overflow-hidden bg-ink text-center"
    >
      {/* Poster shows instantly, and stays as the fallback if video can't play */}
      <img
        src={POSTER_SRC}
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        fetchPriority="high"
      />
      {!reduceMotion && (
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onPlaying={() => setVideoReady(true)}
          className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/40 to-ink/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(28,27,24,0.5),transparent_75%)]" />

      <div className="relative z-10 max-w-3xl px-6">
        <span
          className="animate-fade-up inline-block rounded-full border border-white/25 bg-ink/55 px-4 py-1.5 text-sm font-semibold tracking-wide text-white backdrop-blur"
          style={{ animationDelay: "100ms" }}
        >
          Built for Nigerian renters
        </span>
        <h1
          className="animate-fade-up mt-5 font-display text-5xl font-bold leading-[1.03] text-white md:text-7xl"
          style={{ ...TEXT_SHADOW, animationDelay: "250ms" }}
        >
          Find a home without the wahala.
        </h1>
        <p
          className="animate-fade-up mx-auto mt-6 max-w-xl text-lg font-medium text-white md:text-xl"
          style={{ ...TEXT_SHADOW, animationDelay: "400ms" }}
        >
          Search and inspect for free. Pay only when you&apos;re ready to move in.
        </p>
        <div
          className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "550ms" }}
        >
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 rounded-full bg-palm px-7 py-3.5 text-lg font-semibold text-white shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-palm-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Browse Listings <ArrowRight size={18} />
          </Link>
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/10 px-7 py-3.5 text-lg font-semibold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            List your property
          </Link>
        </div>
      </div>

      <ChevronDown
        aria-hidden="true"
        size={28}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-white/80"
      />
    </section>
  );
}
