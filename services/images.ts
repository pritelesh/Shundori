import "server-only";

import { randomUUID } from "node:crypto";

import { requireAdmin } from "@/services/authorization";
import { toImagePaths } from "@/services/parsers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

const BUCKET_ID = "product-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 8;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ProductImageResult {
  path: string;
  url: string;
  warning?: string;
}

function assertProductId(productId: string): void {
  if (!UUID_PATTERN.test(productId)) {
    throw new Error("A valid product id is required.");
  }
}

function assertPathForProduct(path: string, productId: string): void {
  if (!path.startsWith(`products/${productId}/`)) {
    throw new Error("Image path does not belong to this product.");
  }
}

export function validateProductImageFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG and WebP images are supported.");
  }

  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be between 1 byte and 5 MB.");
  }
}

function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);

  return cleaned || "image";
}

function buildObjectPath(productId: string, fileName: string): string {
  return `products/${productId}/${randomUUID()}-${safeFileName(fileName)}`;
}

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

async function readImagePaths(
  supabase: AdminClient,
  productId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("products")
    .select("images")
    .eq("id", productId)
    .maybeSingle<{ images: unknown }>();

  if (error) throw error;
  if (!data) throw new Error("Product not found.");

  return toImagePaths(data.images);
}

async function writeImagePaths(
  supabase: AdminClient,
  productId: string,
  paths: string[],
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ images: paths, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) throw error;
}

async function uploadObject(
  supabase: AdminClient,
  path: string,
  file: File,
): Promise<ProductImageResult> {
  const { error } = await supabase.storage
    .from(BUCKET_ID)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  return {
    path,
    url: supabase.storage.from(BUCKET_ID).getPublicUrl(path).data.publicUrl,
  };
}

/** Admin-only upload: validates the file, writes Storage, then records the path. */
export async function uploadProductImage(input: {
  productId: string;
  file: File;
}): Promise<ProductImageResult> {
  await requireAdmin();
  assertProductId(input.productId);
  validateProductImageFile(input.file);

  const supabase = createAdminSupabaseClient();
  const paths = await readImagePaths(supabase, input.productId);

  if (paths.length >= MAX_IMAGES) {
    throw new Error(`A product can have at most ${MAX_IMAGES} images.`);
  }

  const path = buildObjectPath(input.productId, input.file.name);
  const result = await uploadObject(supabase, path, input.file);

  try {
    await writeImagePaths(supabase, input.productId, [...paths, path]);
  } catch (error) {
    await supabase.storage.from(BUCKET_ID).remove([path]);
    throw error;
  }

  return result;
}

/** Replaces one image in place, keeping the product's display order stable. */
export async function replaceProductImage(input: {
  productId: string;
  currentPath: string;
  file: File;
}): Promise<ProductImageResult> {
  await requireAdmin();
  assertProductId(input.productId);
  assertPathForProduct(input.currentPath, input.productId);
  validateProductImageFile(input.file);

  const supabase = createAdminSupabaseClient();
  const paths = await readImagePaths(supabase, input.productId);

  if (!paths.includes(input.currentPath)) {
    throw new Error("The image to replace is not on this product.");
  }

  const path = buildObjectPath(input.productId, input.file.name);
  const result = await uploadObject(supabase, path, input.file);
  const updatedPaths = paths.map((entry) =>
    entry === input.currentPath ? path : entry,
  );

  try {
    await writeImagePaths(supabase, input.productId, updatedPaths);
  } catch (error) {
    await supabase.storage.from(BUCKET_ID).remove([path]);
    throw error;
  }

  const { error: cleanupError } = await supabase.storage
    .from(BUCKET_ID)
    .remove([input.currentPath]);

  if (cleanupError) {
    console.warn("Image replaced, but the old object could not be removed:", cleanupError);
    result.warning = "Image replaced, but the previous file could not be removed.";
  }

  return result;
}

/** Removes the Storage object and its path from the product record. */
export async function deleteProductImage(input: {
  productId: string;
  path: string;
}): Promise<{ warning?: string }> {
  await requireAdmin();
  assertProductId(input.productId);
  assertPathForProduct(input.path, input.productId);

  const supabase = createAdminSupabaseClient();
  const paths = await readImagePaths(supabase, input.productId);
  const updatedPaths = paths.filter((entry) => entry !== input.path);

  if (updatedPaths.length === paths.length) {
    throw new Error("The image is not on this product.");
  }

  await writeImagePaths(supabase, input.productId, updatedPaths);
  const { error } = await supabase.storage.from(BUCKET_ID).remove([input.path]);
  if (error) {
    console.warn("Image removed from product, but the object remains:", error);
    return { warning: "Image removed, but its stored file could not be deleted." };
  }

  return {};
}

/** Reorders an existing image to the first (cover) position. */
export async function setProductImageCover(input: {
  productId: string;
  path: string;
}): Promise<ProductImageResult> {
  await requireAdmin();
  assertProductId(input.productId);
  assertPathForProduct(input.path, input.productId);

  const supabase = createAdminSupabaseClient();
  const paths = await readImagePaths(supabase, input.productId);

  if (!paths.includes(input.path)) {
    throw new Error("The image is not on this product.");
  }

  const ordered = [input.path, ...paths.filter((entry) => entry !== input.path)];
  await writeImagePaths(supabase, input.productId, ordered);

  return {
    path: input.path,
    url: supabase.storage.from(BUCKET_ID).getPublicUrl(input.path).data.publicUrl,
  };
}

/** Public URL helper for a Storage path; no service-role key is required. */
export function getProductImageUrl(path: string): string {
  const { data } = createPublicSupabaseClient()
    .storage.from(BUCKET_ID)
    .getPublicUrl(path);

  return data.publicUrl;
}
