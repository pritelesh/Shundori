import type { ProductTone, ProductVisualShape } from "@/types/product";

const visualShapes: readonly ProductVisualShape[] = [
  "dropper",
  "bottle",
  "jar",
  "tube",
  "compact",
  "lipstick",
  "perfume",
  "mist",
];

const tones: readonly ProductTone[] = ["pink", "emerald", "charcoal", "cream"];

const PUBLIC_OBJECT_MARKER = "/storage/v1/object/public/product-images/";
const STORAGE_PATH_PATTERN = /^products\/[0-9a-f-]+\/[^/]+$/i;

/** Normalises a JSONB text array defensively. */
export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Converts a database image entry into a Storage object path.
 *
 * Only `product-images` paths (or public URLs for that bucket) are accepted.
 * Rejecting arbitrary hosts prevents `next/image` failures and keeps every
 * image subject to the bucket's policies.
 */
export function toImagePaths(value: unknown): string[] {
  const unique = new Set<string>();

  for (const entry of toStringArray(value)) {
    const path = normaliseImagePath(entry);
    if (path) unique.add(path);
  }

  return [...unique];
}

function normaliseImagePath(entry: string): string | null {
  if (!/^https?:\/\//i.test(entry)) {
    return STORAGE_PATH_PATTERN.test(entry) ? entry : null;
  }

  try {
    const parsed = new URL(entry);
    if (!/(^|\.)supabase\.co$/i.test(parsed.hostname)) return null;

    const markerIndex = parsed.pathname.indexOf(PUBLIC_OBJECT_MARKER);
    if (markerIndex === -1) return null;

    const path = decodeURIComponent(
      parsed.pathname.slice(markerIndex + PUBLIC_OBJECT_MARKER.length),
    );

    return STORAGE_PATH_PATTERN.test(path) ? path : null;
  } catch {
    return null;
  }
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

/** Stable placeholder artwork for records without uploaded photography. */
export function fallbackVisual(seed: string): ProductVisualShape {
  return visualShapes[hash(seed) % visualShapes.length] ?? "dropper";
}

export function fallbackTone(seed: string): ProductTone {
  return tones[hash(`${seed}-tone`) % tones.length] ?? "emerald";
}

/** Monogram used when a brand has no logo artwork. */
export function monogramFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "S";
}
