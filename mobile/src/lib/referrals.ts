import { requireOptionalNativeModule } from "expo-modules-core";
import { useQuery } from "@tanstack/react-query";
import * as rules from "@shared/referrals.js";
import { supabase } from "./supabase";

// Referral rules live in shared/; this binds them to the app's Supabase client.
export const SITE = process.env.EXPO_PUBLIC_SITE_URL || "";

export type ReferralSummary = {
  code: string;
  balance: number;
  joined: number;
  listers: number;
  views: number;
  bookings: number;
  seekers_confirmed: number;
};

export const { normalizeCode, shareMessage, cardUrl, inviteMessage, seekerProgress, signupInviteCode, statsLine } = rules;

export const inviteCodeExists = (code: string) => rules.inviteCodeExists(supabase, code) as Promise<boolean>;
export const claimInviteCode = (code: string) => rules.claimInviteCode(supabase, code) as Promise<boolean>;
export const fetchReferralSummary = () => rules.fetchReferralSummary(supabase) as Promise<ReferralSummary | null>;
export const spendBoostDays = (listingId: string, days: number) => rules.spendBoostDays(supabase, listingId, days) as Promise<string>;

// Invite code, share stats and boost days for the logged-in person; null
// when logged out or before the feature is set up in the database.
export function useReferralSummary(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["referral-summary", userId ?? ""],
    queryFn: fetchReferralSummary,
    enabled: Boolean(userId),
  });
}

// Posting the picture needs expo-sharing, which only builds made after it was
// added include. Older builds hide the option instead of crashing.
export function canShareImages(): boolean {
  return requireOptionalNativeModule("ExpoSharing") !== null;
}
