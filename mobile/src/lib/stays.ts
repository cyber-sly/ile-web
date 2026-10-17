import { useQuery } from "@tanstack/react-query";
import * as rules from "@shared/stays.js";
import { supabase } from "./supabase";

// Stay rules live in shared/; this binds them to the app's Supabase client.
export type StayRow = Record<string, any>;
export type TakenRange = { check_in: string; check_out: string };

export const { STAY_STATUS, stayNights, stayQuote, validateStayRequest, stayActions, sortStays, MAX_STAY_NOTE } = rules;

export const requestStay = (req: { listingId: string; checkIn: string; checkOut: string; guests: number; note: string }) =>
  rules.requestStay(supabase, req) as Promise<string>;
export const respondStay = (id: string, accept: boolean, reason: string) => rules.respondStay(supabase, id, accept, reason) as Promise<void>;
export const cancelStay = (id: string) => rules.cancelStay(supabase, id) as Promise<void>;
export const leaveStayReview = (review: { stayId: string; rating: number; comment: string; accurate: boolean | null }) =>
  rules.leaveStayReview(supabase, review) as Promise<string>;
export const fetchTakenDates = (listingId: string) => rules.fetchTakenDates(supabase, listingId) as Promise<TakenRange[]>;
export const fetchMyStays = (userId: string) => rules.fetchMyStays(supabase, userId) as Promise<StayRow[]>;
export const fetchStayRequests = (listingIds: string[]) => rules.fetchStayRequests(supabase, listingIds) as Promise<StayRow[]>;
export const fetchReviewedStayIds = (ids: string[], userId: string) => rules.fetchReviewedStayIds(supabase, ids, userId) as Promise<Set<string>>;

// Today in Lagos, as YYYY-MM-DD.
export const lagosToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

// True once supabase/stays.sql has been run (the stay columns exist).
async function checkStaysReady(): Promise<boolean> {
  const { error } = await supabase.from("listings").select("max_guests").limit(1);
  return !error;
}

export function useStaysReady(): boolean {
  const q = useQuery({ queryKey: ["stays-ready"], queryFn: checkStaysReady, staleTime: 60 * 60 * 1000 });
  return q.data === true;
}
