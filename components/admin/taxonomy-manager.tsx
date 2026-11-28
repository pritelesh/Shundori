"use client";

/* eslint-disable @next/next/no-img-element */

import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  createBrandAction,
  createCategoryAction,
  deleteBrandAction,
  deleteCategoryAction,
  toggleBrandActiveAction,
  toggleCategoryActiveAction,
  updateBrandAction,
  updateCategoryAction,
} from "@/app/admin/(panel)/actions";
import { initialMutationState } from "@/app/admin/(panel)/mutation-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export interface TaxonomyItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  productCount: number;
  parentId?: string | null;
}

type Kind = "brands" | "categories";

function TaxonomyFormFields({
  kind,
  items,
  item,
  fieldErrors,
}: {
  kind: Kind;
  items: TaxonomyItem[];
  item?: TaxonomyItem;
  fieldErrors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium">
          Name *
        </label>
        <Input
          id="name"
          name="name"
          required
          maxLength={100}
          defaultValue={item?.name}
          placeholder={kind === "brands" ? "e.g. Garnier" : "e.g. Skincare"}
        />
        {fieldErrors.name ? (
          <p className="mt-1.5 text-xs text-forest">{fieldErrors.name}</p>
        ) : null}
      </div>

      {kind === "categories" ? (
        <div>
          <label htmlFor="parentId" className="mb-2 block text-sm font-medium">
            Parent category
          </label>
          <select
            id="parentId"
            name="parentId"
            defaultValue={item?.parentId ?? ""}
            className="h-11 w-full rounded-lg border border-sage-light bg-cream px-4 text-sm"
          >
            <option value="">None (top level)</option>
            {items
              .filter((entry) => entry.id !== item?.id)
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={item?.description ?? ""}
          className="w-full rounded-lg border border-sage-light bg-cream px-4 py-3 text-sm"
        />
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={item?.isActive ?? true}
          className="size-4 accent-leaf"
        />
        Active and visible on the storefront
      </label>
    </div>
  );
}

export function TaxonomyManager({
  kind,
  items,
}: {
  kind: Kind;
  items: TaxonomyItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);
  const [deleting, setDeleting] = useState<TaxonomyItem | null>(null);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [busyAsset, setBusyAsset] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const assetInputs = useRef(new Map<string, HTMLInputElement>());

  const singular = kind === "brands" ? "brand" : "category";

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        kind === "brands"
          ? await createBrandAction(initialMutationState, formData)
          : await createCategoryAction(initialMutationState, formData);

      if (result.status === "error") {
        setCreateErrors(result.fieldErrors);
        toast({ title: "Could not create", description: result.message, variant: "promo" });
        return;
      }

      setCreateErrors({});
      setCreateOpen(false);
      toast({ title: result.message, variant: "success" });
      router.refresh();
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const formData = new FormData(event.currentTarget);
    const id = editing.id;

    startTransition(async () => {
      const result =
        kind === "brands"
          ? await updateBrandAction(id, initialMutationState, formData)
          : await updateCategoryAction(id, initialMutationState, formData);

      if (result.status === "error") {
        setEditErrors(result.fieldErrors);
        toast({ title: "Could not save", description: result.message, variant: "promo" });
        return;
      }

      setEditErrors({});
      setEditing(null);
      toast({ title: result.message, variant: "success" });
      router.refresh();
    });
  }

  function toggle(item: TaxonomyItem) {
    startTransition(async () => {
      const result =
        kind === "brands"
          ? await toggleBrandActiveAction(item.id, !item.isActive)
          : await toggleCategoryActiveAction(item.id, !item.isActive);

      if (result.status === "error") {
        toast({ title: "Update failed", description: result.message, variant: "promo" });
        return;
      }
      toast({ title: result.message, variant: "success" });
      router.refresh();
    });
  }

  function remove() {
    if (!deleting) return;

    startTransition(async () => {
      const result =
        kind === "brands"
          ? await deleteBrandAction(deleting.id)
          : await deleteCategoryAction(deleting.id);

      if (result.status === "error") {
        toast({ title: "Delete failed", description: result.message, variant: "promo" });
        return;
      }
      toast({ title: result.message, variant: "success" });
      setDeleting(null);
      router.refresh();
    });
  }

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>, item: TaxonomyItem) {
    const [file] = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!file) return;

    setBusyAsset(item.id);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(`/api/admin/assets/${kind}/${item.id}`, {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { error?: string; warning?: string };
      if (!response.ok) throw new Error(payload.error || "Upload failed.");
      toast({ title: "Image uploaded", variant: "success" });
      if (payload.warning) {
        toast({ title: "Cleanup warning", description: payload.warning, variant: "promo" });
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "promo",
      });
    } finally {
      setBusyAsset(null);
    }
  }

  async function removeAsset(item: TaxonomyItem) {
    if (!window.confirm(`Remove the ${singular} image?`)) return;

    setBusyAsset(item.id);
    try {
      const response = await fetch(`/api/admin/assets/${kind}/${item.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string; warning?: string };
      if (!response.ok) throw new Error(payload.error || "Removal failed.");
      toast({ title: "Image removed", variant: "success" });
      if (payload.warning) {
        toast({ title: "Cleanup warning", description: payload.warning, variant: "promo" });
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not remove image",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "promo",
      });
    } finally {
      setBusyAsset(null);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add {singular}
        </Button>
      </div>

      <div className="mt-6 overflow-hidden surface-card rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-[0.08em] text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">
                  {kind === "brands" ? "Logo" : "Image"}
                </th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Products</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-light/70">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-soft">
                    No {kind} yet. Add the first one to get started.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-11 items-center justify-center overflow-hidden rounded-lg border border-sage-light bg-cream">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={`${item.name} ${kind === "brands" ? "logo" : "image"}`}
                              className="size-full object-contain"
                            />
                          ) : (
                            <span className="font-display text-lg text-leaf">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <input
                          ref={(node) => {
                            if (node) assetInputs.current.set(item.id, node);
                            else assetInputs.current.delete(item.id);
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(event) => uploadAsset(event, item)}
                          disabled={busyAsset === item.id}
                        />
                        <button
                          type="button"
                          onClick={() => assetInputs.current.get(item.id)?.click()}
                          disabled={busyAsset === item.id}
                          aria-label={`Upload image for ${item.name}`}
                          className="inline-flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-sage-light hover:text-forest disabled:opacity-50"
                        >
                          <ImagePlus className="size-4" aria-hidden="true" />
                        </button>
                        {item.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => removeAsset(item)}
                            disabled={busyAsset === item.id}
                            aria-label={`Remove image for ${item.name}`}
                            className="inline-flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-sage-light hover:text-ink-soft disabled:opacity-50"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-0.5 max-w-xs truncate text-xs text-ink-soft">
                        {item.description || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{item.productCount}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(item)}
                        disabled={pending}
                        className={
                          item.isActive
                            ? "rounded-full bg-sage-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-forest"
                            : "rounded-full bg-sage-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft"
                        }
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditErrors({});
                            setEditing(item);
                          }}
                          aria-label={`Edit ${item.name}`}
                          className="inline-flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-sage-light hover:text-ink-soft"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(item)}
                          aria-label={`Delete ${item.name}`}
                          className="inline-flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-sage-light hover:text-ink-soft"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Add ${singular}`}
      >
        <form onSubmit={submitCreate} className="space-y-5">
          <TaxonomyFormFields
            kind={kind}
            items={items}
            fieldErrors={createErrors}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : `Create ${singular}`}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit ${singular}`}
      >
        {editing ? (
          <form onSubmit={submitEdit} className="space-y-5">
            <TaxonomyFormFields
              kind={kind}
              items={items}
              item={editing}
              fieldErrors={editErrors}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete ${singular}?`}
        description="This cannot be undone."
      >
        <p className="text-sm text-ink-soft">
          {deleting?.productCount
            ? `Move or delete the ${deleting.productCount} product(s) using this ${singular} first.`
            : `The ${singular} and its image will be permanently removed.`}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleting(null)}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
