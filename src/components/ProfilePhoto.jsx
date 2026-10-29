"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import Lightbox from "@/components/Lightbox";

// Avatar that opens the photo full screen when clicked (like WhatsApp).
// Without a photo it's the plain initial circle.
export default function ProfilePhoto({ src, name, size, className = "" }) {
  const [open, setOpen] = useState(false);
  if (!src) return <Avatar src={src} name={name} size={size} className={className} />;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${name ? `${name}'s` : "profile"} photo`}
        className={`shrink-0 cursor-zoom-in rounded-full transition-opacity hover:opacity-90 ${className}`}
      >
        <Avatar src={src} name={name} size={size} />
      </button>
      {open && <Lightbox images={[src]} title={name || "Profile photo"} start={0} onClose={() => setOpen(false)} />}
    </>
  );
}
