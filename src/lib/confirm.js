"use client";

import { useSyncExternalStore } from "react";

// Branded replacement for window.confirm:
//   if (!(await confirmAction({ title: "Delete this listing?", confirmLabel: "Delete" }))) return;
// <ConfirmHost /> in the root layout shows the dialog.
let current = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function confirmAction({ title, body = "", confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger" }) {
  // A new request answers any open one with "no".
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { title, body, confirmLabel, cancelLabel, tone, resolve };
    emit();
  });
}

export function answerConfirm(request, value) {
  request.resolve(value);
  if (current === request) {
    current = null;
    emit();
  }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConfirmRequest() {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
