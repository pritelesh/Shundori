import "server-only";

import { randomUUID } from "node:crypto";

import { assertUuid } from "@/lib/admin-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/services/authorization";

type BucketId = "brand-assets" | "category-assets";
type TableName = "brands" | "categories";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const BUCKET_CONFIG: Record<
  BucketId,
  { table: TableName; folder: string; column: "logo_url" | "image_url" }
> = {
  "brand-assets": { table: "brands", folder: "brands", column: "logo_url" },
  "category-assets": {
    table: "categories",
    folder: "categories",
    column: "image_url",
  },
};

interface AssetResult {
  path: string;
  url: string;
  warning?: string;
}

function validateFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG and WebP images are supported.");
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new Error("Images must be between 1 byte and 5 MB.");
  }
}

function safeFileName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-60) || "image"
  );
}

function objectPath(folder: string, ownerId: string, fileName: string): string {
  return `${folder}/${ownerId}/${randomUUID()}-${safeFileName(fileName)}`;
}

async function readCurrentPath(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  bucket: BucketId,
  ownerId: string,
): Promise<string | null> {
  const { table, column } = BUCKET_CONFIG[bucket];
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .eq("id", ownerId)
    .maybeSingle<Record<string, string | null>>();

  if (error) throw error;
  if (!data) throw new Error(`${table.slice(0, -1)} not found.`);

  return data[column] ?? null;
}

async function savePath(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  bucket: BucketId,
  ownerId: string,
  path: string | null,
): Promise<void> {
  const { table, column } = BUCKET_CONFIG[bucket];
  const { error } = await supabase
    .from(table)
    .update({ [column]: path, updated_at: new Date().toISOString() })
    .eq("id", ownerId);

  if (error) throw error;
}

/**
 * Uploads a brand logo or category image, then stores the object path. The old
 * object is removed only after the database write succeeds.
 */
export async function uploadAdminAsset(
  bucket: BucketId,
  ownerId: string,
  file: File,
): Promise<AssetResult> {
  await requireAdmin();
  assertUuid(ownerId);
  validateFile(file);

  const config = BUCKET_CONFIG[bucket];
  const supabase = createAdminSupabaseClient();
  const previousPath = await readCurrentPath(supabase, bucket, ownerId);
  const path = objectPath(config.folder, ownerId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;

  try {
    await savePath(supabase, bucket, ownerId, path);
  } catch (error) {
    await supabase.storage.from(bucket).remove([path]);
    throw error;
  }

  let warning: string | undefined;
  if (previousPath && previousPath !== path) {
    const { error: cleanupError } = await supabase.storage
      .from(bucket)
      .remove([previousPath]);

    if (cleanupError) {
      console.warn("Asset uploaded, but the previous file remains:", cleanupError);
      warning = "New image saved, but the previous file could not be removed.";
    }
  }

  return {
    path,
    url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
    warning,
  };
}

/** Removes an asset from Storage and clears its database reference. */
export async function removeAdminAsset(
  bucket: BucketId,
  ownerId: string,
): Promise<{ warning?: string }> {
  await requireAdmin();
  assertUuid(ownerId);

  const supabase = createAdminSupabaseClient();
  const currentPath = await readCurrentPath(supabase, bucket, ownerId);

  await savePath(supabase, bucket, ownerId, null);

  if (currentPath) {
    const { error } = await supabase.storage.from(bucket).remove([currentPath]);
    if (error) {
      console.warn("Asset reference cleared, but the object remains:", error);
      return { warning: "Asset removed, but its stored file could not be deleted." };
    }
  }

  return {};
}
