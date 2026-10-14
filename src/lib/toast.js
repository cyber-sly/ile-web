"use client";

import { useSyncExternalStore } from "react";

// Brief confirmations ("Saved", "Viewing requested"). Call toast() from
// anywhere; <Toaster /> in the root layout shows them.
let toasts = [];
let nextId = 1;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function toast(message, { tone = "success", duration = 3200 } = {}) {
  const id = nextId++;
  // One at a time reads best on a phone: a new toast replaces the old one.
  toasts = [{ id, message, tone, leaving: false }];
  emit();
  setTimeout(() => dismissToast(id), duration);
  return id;
}

export function dismissToast(id) {
  if (!toasts.some((t) => t.id === id && !t.leaving)) return;
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 180);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY = [];
export function useToasts() {
  return useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
}
