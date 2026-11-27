"use client";

/* eslint-disable @next/next/no-img-element */

import { ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { useCallback, useRef, useState, type ChangeEvent } from "react";

import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";

export interface AdminImageItem {
  path: string;
  url: string;
}

const MAX_IMAGES = 8;
const ENDPOINT = (productId: string) =>
  `/api/admin/products/${productId}/images`;

interface UploadState {
  label: string;
  progress: number;
}

interface UploadResponse {
  results: AdminImageItem[];
  warnings: string[];
  failures: string[];
}

function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (percent: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      let payload: {
        results?: AdminImageItem[];
        warnings?: string[];
        failures?: string[];
        error?: string;
      } = {};
      try {
        payload = JSON.parse(request.responseText) as typeof payload;
      } catch {
        // Handled below by the missing results array.
      }

      if (request.status >= 200 && request.status < 300 && Array.isArray(payload.results)) {
        resolve({
          results: payload.results,
          warnings: payload.warnings ?? [],
          failures: payload.failures ?? [],
        });
        return;
      }

      reject(new Error(payload.error || `Upload failed (${request.status}).`));
    };
    request.onerror = () => reject(new Error("The upload could not be completed."));
    request.send(body);
  });
}

export function ProductImageManager({
  productId,
  initialImages,
}: {
  productId: string;
  initialImages: AdminImageItem[];
}) {
  const { toast } = useToast();
  const [images, setImages] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const replaceInputs = useRef(new Map<string, HTMLInputElement>());

  const runUpload = useCallback(
    async (body: FormData, label: string, intent: "upload" | "replace") => {
      setBusy(true);
      setUpload({ label, progress: 0 });

      try {
        const response = await uploadWithProgress(
          ENDPOINT(productId),
          body,
          (progress) => setUpload({ label, progress }),
        );

        if (intent === "upload") {
          setImages((current) => [...current, ...response.results]);
          toast({
            title: "Images uploaded",
            description: `${response.results.length} image(s) added.`,
            variant: "success",
          });
        } else {
          const [result] = response.results;
          if (result) {
            setImages((current) =>
              current.map((image) =>
                image.path === body.get("path") ? result : image,
              ),
            );
            toast({ title: "Image replaced", variant: "success" });
          }
        }

        if (response.failures.length > 0) {
          toast({
            title: "Some images failed",
            description: response.failures.join(" "),
            variant: "promo",
          });
        }
        for (const warning of response.warnings) {
          toast({ title: "Cleanup warning", description: warning, variant: "promo" });
        }
      } catch (error) {
        toast({
          title: "Image upload failed",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "promo",
        });
      } finally {
        setBusy(false);
        setUpload(null);
      }
    },
    [productId, toast],
  );

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast({
        title: "Image limit reached",
        description: `A product can have at most ${MAX_IMAGES} images.`,
        variant: "promo",
      });
      return;
    }

    const selected = files.slice(0, remaining);
    for (const [index, file] of selected.entries()) {
      const body = new FormData();
      body.set("intent", "upload");
      body.append("files", file);
      await runUpload(body, `${index + 1}/${selected.length}: ${file.name}`, "upload");
    }

    if (files.length > remaining) {
      toast({
        title: "Some images were skipped",
        description: `Only ${remaining} image slot(s) were available.`,
        variant: "info",
      });
    }
  }

  async function handleReplace(event: ChangeEvent<HTMLInputElement>, path: string) {
    const [file] = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!file) return;

    const body = new FormData();
    body.set("intent", "replace");
    body.set("path", path);
    body.set("file", file);
    await runUpload(body, `Replacing ${file.name}`, "replace");
  }

  async function handleSetCover(path: string) {
    setBusy(true);
    try {
      const body = new FormData();
      body.set("intent", "setCover");
      body.set("path", path);
      const response = await fetch(ENDPOINT(productId), {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as {
        error?: string;
        results?: AdminImageItem[];
      };
      if (!response.ok) throw new Error(payload.error || "Could not set cover image.");

      const result = payload.results?.[0];
      if (result) {
        setImages((current) => [
          result,
          ...current.filter((image) => image.path !== result.path),
        ]);
      }
      toast({ title: "Cover image updated", variant: "success" });
    } catch (error) {
      toast({
        title: "Could not set cover image",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "promo",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(path: string) {
    if (!window.confirm("Remove this image from the product?")) return;

    setBusy(true);
    try {
      const body = new FormData();
      body.set("intent", "delete");
      body.set("path", path);
      const response = await fetch(ENDPOINT(productId), {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Removal failed.");

      setImages((current) => current.filter((image) => image.path !== path));
      toast({ title: "Image removed", variant: "success" });
    } catch (error) {
      toast({
        title: "Could not remove image",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "promo",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl">Product images</h2>
          <p className="mt-1 text-xs text-muted">
            JPEG, PNG or WebP up to 5 MB each. Maximum {MAX_IMAGES} images.
          </p>
        </div>
        <label
          className={cn(
            "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-emerald/30 px-5 text-sm font-medium text-emerald transition-colors hover:bg-emerald-soft",
            (busy || images.length >= MAX_IMAGES) && "pointer-events-none opacity-50",
          )}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Add images
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleFiles}
            disabled={busy || images.length >= MAX_IMAGES}
          />
        </label>
      </div>

      {upload ? (
        <div className="mt-5" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-xs text-muted">
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            {upload.label} — {upload.progress}%
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-deep">
            <div
              className="h-full rounded-full bg-emerald transition-all"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {images.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-line-strong bg-cream-soft/60 px-5 py-10 text-center text-sm text-muted">
          No images yet. Uploaded images appear on the storefront immediately.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.path}
              className="overflow-hidden rounded-xl border border-line bg-cream-soft"
            >
              <div className="relative aspect-square bg-white">
                <img
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  className="size-full object-contain"
                />
                <span className="absolute left-2 top-2 rounded-full bg-charcoal/70 px-2 py-0.5 text-[10px] text-white">
                  {index === 0 ? "Cover" : index + 1}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1 p-2">
                <input
                  ref={(node) => {
                    if (node) replaceInputs.current.set(image.path, node);
                    else replaceInputs.current.delete(image.path);
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => handleReplace(event, image.path)}
                  disabled={busy}
                />
                {index === 0 ? null : (
                  <button
                    type="button"
                    onClick={() => handleSetCover(image.path)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald hover:bg-emerald-soft disabled:opacity-50"
                  >
                    <Star className="size-3.5" aria-hidden="true" />
                    Set cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => replaceInputs.current.get(image.path)?.click()}
                  disabled={busy}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-emerald hover:bg-emerald-soft disabled:opacity-50"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(image.path)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-pink-tint hover:text-charcoal disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
