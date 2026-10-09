"use client";

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchSavedIds, saveListing, unsaveListing, importSavedIds } from "@shared/saved.js";

// Saved homes. Logged in: stored on the account (synced across devices and
// the app). Logged out: stored in this browser, then imported into the
// account at the next login. Every heart on the page shares this one store.
const KEY = "ile:saved-listings";

let ids = [];
let snapshot = "[]";
let userId = null;
let started = false;
const listeners = new Set();

function emit(next) {
  ids = next;
  snapshot = JSON.stringify(ids);
  listeners.forEach((l) => l());
}

function readLocal() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {}
}

async function switchAccount(user) {
  if (!user) {
    userId = null;
    emit(readLocal());
    return;
  }
  if (user.id === userId) return;
  userId = user.id;
  try {
    const local = readLocal();
    if (local.length) {
      await importSavedIds(supabase, user.id, local);
      writeLocal([]);
    }
    if (userId === user.id) emit(await fetchSavedIds(supabase));
  } catch {
    // Keep showing what we have; the next login or refresh retries.
  }
}

function start() {
  if (started) return;
  started = true;
  emit(readLocal());
  supabase.auth.getSession().then(({ data }) => switchAccount(data.session?.user ?? null));
  supabase.auth.onAuthStateChange((_event, session) => {
    switchAccount(session?.user ?? null);
  });
  // Logged-out saves made in another tab.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && !userId) emit(readLocal());
  });
}

function subscribe(listener) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readSaved() {
  return ids;
}

export async function toggleSaved(id) {
  start();
  const key = String(id);
  const previous = ids;
  const removing = previous.includes(key);
  emit(removing ? previous.filter((x) => x !== key) : [key, ...previous]);

  if (!userId) {
    writeLocal(ids);
    return;
  }
  try {
    if (removing) await unsaveListing(supabase, userId, key);
    else await saveListing(supabase, userId, key);
  } catch {
    emit(previous); // undo the heart if the save didn't stick
  }
}

// The saved id list (as strings).
export function useSavedIds() {
  return JSON.parse(useSyncExternalStore(subscribe, () => snapshot, () => "[]"));
}
