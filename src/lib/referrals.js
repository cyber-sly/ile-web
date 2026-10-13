// Referral rules live in shared/; this binds them to the website's Supabase
// client and to this browser's storage.
import { supabase } from "@/lib/supabaseClient";
import * as rules from "@shared/referrals.js";

export { normalizeCode, shareMessage, shareUrl, cardUrl, inviteMessage, seekerProgress, signupInviteCode } from "@shared/referrals.js";

export const PENDING_INVITE_KEY = "ile:pending-invite";
const DEVICE_KEY = "ile:device";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function rememberRefHere(code) {
  const s = storage();
  if (s) rules.rememberRef(s, code);
}

export function readRefHere() {
  const s = storage();
  return s ? rules.readRef(s) : null;
}

// A random id for this browser, so a visit is counted once a day.
export function deviceId() {
  const s = storage();
  if (!s) return null;
  try {
    let id = s.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      s.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export const inviteCodeExists = (code) => rules.inviteCodeExists(supabase, code);
export const claimInviteCode = (code) => rules.claimInviteCode(supabase, code);
export const recordShareVisit = (args) => rules.recordShareVisit(supabase, args);
export const recordBookingRef = (id, code) => rules.recordBookingRef(supabase, id, code);
export const fetchReferralSummary = () => rules.fetchReferralSummary(supabase);
export const spendBoostDays = (listingId, days) => rules.spendBoostDays(supabase, listingId, days);
export const fetchHeldRewards = () => rules.fetchHeldRewards(supabase);
export const resolveHeldReward = (id, approve) => rules.resolveHeldReward(supabase, id, approve);
