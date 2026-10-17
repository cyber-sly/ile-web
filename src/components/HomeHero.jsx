"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import SearchBox from "@/components/SearchBox";

// Swap these files in /public/videos to change the hero footage.
const VIDEO_SRC = "/videos/hero.mp4";
const POSTER_SRC = "/videos/hero-poster.jpg";

// Video only plays on larger screens, without data-saver or reduced motion.
// Phones (often on metered data) get the still poster instead of a ~4MB download.
function shouldPlayVideo() {
  const wide = window.matchMedia("(min-width: 768px)").matches;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection?.saveData === true;
  return wide && !calm && !saveData;
}

export default function HomeHero() {
  const [playVideo, setPlayVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Deferred so the decision runs after hydration, on the client only.
    const id = requestAnimationFrame(() => setPlayVideo(shouldPlayVideo()));
    return () => cancelAnimationFrame(id);
  }, []);

  // Pause decoding while the hero is off screen.
  useEffect(() => {
    const video = videoRef.current;
    if (!playVideo || !video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [playVideo]);

  return (
    <section aria-label="Search for property" className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-6">
      <div className="relative isolate overflow-hidden rounded-[var(--radius-hero)] bg-ink">
        <Image src={POSTER_SRC} alt="" fill priority sizes="(min-width: 1280px) 1280px, 100vw" className="-z-20 object-cover" />
        {playVideo && (
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            poster={POSTER_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            onPlaying={() => setVideoReady(true)}
            className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0E1526]/20 via-[#0E1526]/35 to-[#0E1526]/80" />

        <div className="px-5 pb-24 pt-28 sm:px-10 sm:pb-28 sm:pt-40 md:pt-48">
          <h1 className="animate-fade-up max-w-3xl font-serif text-[2.6rem] font-medium leading-[1.04] tracking-tight text-white sm:text-6xl md:text-7xl">
            Find your place in Nigeria, <em className="font-normal">without wahala.</em>
          </h1>
          <p
            className="animate-fade-up mt-4 max-w-xl text-lg text-white/90"
            style={{ animationDelay: "120ms" }}
          >
            Homes, land and shops to rent or buy, in every state in Nigeria. Free to search, free to book.
          </p>
        </div>
      </div>

      {/* Search floats over the bottom edge of the photo. */}
      <div className="relative z-10 -mt-14 px-3 sm:-mt-16 sm:px-10">
        <SearchBox className="max-w-3xl" />
      </div>
    </section>
  );
}
