// Small taps of feedback for key moments (save, tab change, request sent).
// expo-haptics is a native module: builds made before it was added don't
// have it, so every call quietly does nothing there instead of crashing.
type HapticsModule = typeof import("expo-haptics");

let mod: HapticsModule | null | undefined;
function haptics(): HapticsModule | null {
  if (mod === undefined) {
    try {
      mod = require("expo-haptics") as HapticsModule;
    } catch {
      mod = null;
    }
  }
  return mod;
}

function run(fn: (h: HapticsModule) => Promise<void>) {
  const h = haptics();
  if (!h) return;
  try {
    fn(h).catch(() => {});
  } catch {
    // Module present in JS but missing natively.
  }
}

/** Light tick: tabs, chips, steppers. */
export const tapHaptic = () => run((h) => h.selectionAsync());
/** Soft bump: saving a home, opening something important. */
export const pressHaptic = () => run((h) => h.impactAsync(h.ImpactFeedbackStyle.Light));
/** Done: request sent, booking confirmed, listing published. */
export const successHaptic = () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Success));
/** Something went wrong. */
export const errorHaptic = () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Error));
