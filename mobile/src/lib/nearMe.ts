import * as Location from "expo-location";
import { matchPlace } from "@shared/nigeria.js";

export type NearMeResult = { state: string; lga: string } | { error: "denied" | "unavailable" | "unknown-place" };

export const NEAR_ME_ERRORS = {
  denied: "Allow location in Settings to use Near me.",
  unavailable: "Couldn't get your location. Try again outside or pick a state.",
  "unknown-place": "We couldn't match your location to a Nigerian state.",
} as const;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

// The phone's location -> state and LGA (listings have no map coordinates).
export async function findNearMe(): Promise<NearMeResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return { error: "denied" };
  try {
    const position = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 10000);
    const [place] = await Location.reverseGeocodeAsync(position.coords);
    const match = place ? matchPlace({ region: place.region, subregion: place.subregion, city: place.city }) : null;
    return match || { error: "unknown-place" };
  } catch {
    return { error: "unavailable" };
  }
}
