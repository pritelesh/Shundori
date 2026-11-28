import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-sage-light text-leaf">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-5 font-display text-xl text-forest">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
