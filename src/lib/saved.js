"use client";

import { useSyncExternalStore } from "react";

// Saved listings live in this browser only for now. Every heart on the page
// subscribes to the same store, so saving on one card updates the others.
const KEY = "ile:saved-listings";
const EVENT = "ile:saved-change";
const EMPTY = "[]";

function readRaw() {
  try {
    return localStorage.getItem(KEY) || EMPTY;
  } catch {
    return EMPTY;
  }
}

function subscribe(onChange) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse(raw) {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

export function readSaved() {
  return parse(readRaw());
}

export function toggleSaved(id) {
  const key = String(id);
  const current = readSaved();
  const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

// Returns the saved id list (as strings). Snapshot is the raw JSON string so
// React can compare it cheaply between renders.
export function useSavedIds() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => EMPTY);
  return parse(raw);
}
