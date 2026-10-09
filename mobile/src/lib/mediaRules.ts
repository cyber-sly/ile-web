import { MAX_VIDEO_MB } from "@shared/lister.js";

// Photos are resized on the phone to save data: the longer side becomes 1600 px.
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_QUALITY = 0.8;

export function resizeTarget(width: number, height: number, max = PHOTO_MAX_SIDE): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

// "<userId>/<timestamp>-<random>.<ext>": storage only accepts files in the user's own folder.
export function storagePath(userId: string, ext: string, now = Date.now(), random = Math.random()): string {
  return `${userId}/${now}-${random.toString(36).slice(2, 10) || "0"}.${ext}`;
}

export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

export function videoProblem({ size, mime }: { size: number; mime: string }): string | null {
  if (!VIDEO_TYPES[mime]) return "Use an MP4, MOV or WebM video.";
  if (size > MAX_VIDEO_MB * 1024 * 1024) return `Videos must be ${MAX_VIDEO_MB} MB or smaller.`;
  return null;
}
