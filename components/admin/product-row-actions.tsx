"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteProductAction,
  toggleProductActiveAction,
} from "@/app/admin/(panel)/actions";
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
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-olive-deep transition-colors hover:bg-olive-soft disabled:opacity-50"
        >
          {isActive ? "Unpublish" : "Publish"}
        </button>
        <Link
          href={`/admin/products/${id}/edit`}
          aria-label={`Edit ${name}`}
          className="inline-flex size-8 items-center justify-center rounded-lg text-taupe transition-colors hover:bg-soft-cream hover:text-dark-text"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${name}`}
          className="inline-flex size-8 items-center justify-center rounded-lg text-taupe transition-colors hover:bg-soft-cream hover:text-dark-text"
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
        <p className="text-sm text-taupe">
          <span className="font-medium text-dark-text">{name}</span> will no
          longer appear in the store.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full border border-warm-line px-5 py-2.5 text-sm font-medium hover:bg-peach"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-full bg-chocolate px-5 py-2.5 text-sm font-medium text-warm-white disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete product"}
          </button>
        </div>
      </Modal>
    </>
  );
}
