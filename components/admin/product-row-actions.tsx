"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteProductAction,
  toggleProductActiveAction,
} from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export function ProductRowActions({
  id,
  name,
  isActive,
}: {
  id: string;
  name: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleProductActiveAction(
        id,
        !isActive,
      );
      if (result.status === "error") {
        toast({ title: "Update failed", description: result.message, variant: "promo" });
        return;
      }
      toast({ title: result.message, variant: "success" });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (result.status === "error") {
        toast({ title: "Delete failed", description: result.message, variant: "promo" });
        return;
      }
      toast({ title: "Product deleted", variant: "success" });
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-leaf transition-colors hover:bg-sage-light hover:text-forest disabled:opacity-50"
        >
          {isActive ? "Unpublish" : "Publish"}
        </button>
        <Link
          href={`/admin/products/${id}/edit`}
          aria-label={`Edit ${name}`}
          className="inline-flex size-11 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-sage-light hover:text-ink-soft"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${name}`}
          className="inline-flex size-11 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-sage-light hover:text-ink-soft"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this product?"
        description="The product and its uploaded images will be permanently removed."
      >
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-ink-soft">{name}</span> will no
          longer appear in the store.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full border border-sage-light px-5 py-2.5 text-sm font-medium hover:bg-mist"
          >
            Cancel
          </button>
          <Button type="button" variant="destructive" size="sm" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete product"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
