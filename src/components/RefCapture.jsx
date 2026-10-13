"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { deviceId, normalizeCode, recordShareVisit, rememberRefHere } from "@/lib/referrals";

const LISTING_PATH = /^\/listings\/([0-9a-f-]{36})$/i;

// Any page opened with ?ref=CODE: remember the code on this device for 30
// days, and count a visit when it's a listing page. Renders nothing.
export default function RefCapture() {
  const pathname = usePathname();
  useEffect(() => {
    const code = normalizeCode(new URLSearchParams(window.location.search).get("ref"));
    if (!code) return;
    rememberRefHere(code);
    const listingId = pathname?.match(LISTING_PATH)?.[1];
    if (listingId) recordShareVisit({ listingId, code, device: deviceId() });
  }, [pathname]);
  return null;
}
