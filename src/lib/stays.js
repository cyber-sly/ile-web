// Stay rules live in shared/; this binds them to the website's Supabase client.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as rules from "@shared/stays.js";

export { STAY_STATUS, stayNights, stayQuote, validateStayRequest, stayActions, sortStays, MAX_STAY_NOTE } from "@shared/stays.js";

export const requestStay = (req) => rules.requestStay(supabase, req);
export const respondStay = (id, accept, reason) => rules.respondStay(supabase, id, accept, reason);
export const cancelStay = (id) => rules.cancelStay(supabase, id);
export const leaveStayReview = (review) => rules.leaveStayReview(supabase, review);
export const fetchTakenDates = (listingId) => rules.fetchTakenDates(supabase, listingId);
export const fetchMyStays = (userId) => rules.fetchMyStays(supabase, userId);
export const fetchStayRequests = (listingIds) => rules.fetchStayRequests(supabase, listingIds);

// Today in Lagos, as YYYY-MM-DD.
export const lagosToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

// True once supabase/stays.sql has been run (the stay columns exist), so the
// Stays option can be offered. Checked once per page load.
let readyPromise;
export function staysReady() {
  readyPromise ??= supabase
    .from("listings")
    .select("max_guests")
    .limit(1)
    .then(({ error }) => !error)
    .catch(() => false);
  return readyPromise;
}

export function useStaysReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    staysReady().then((ok) => live && setReady(ok));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}
