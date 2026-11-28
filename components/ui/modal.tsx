"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Accessible modal built on the native <dialog> element, which provides focus
 * trapping, Escape handling and scroll locking without extra dependencies.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  bodyClassName,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-w-lg surface-card rounded-2xl p-0 text-ink-soft shadow-soft",
        className,
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-6 border-b border-sage-light/70 px-6 py-5">
        <div>
          <h2 id={titleId} className="font-display text-xl leading-snug">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink-soft"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className={cn("px-6 py-5", bodyClassName)}>{children}</div>
    </dialog>
  );
}
