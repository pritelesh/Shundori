import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface SectionHeadingProps {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-leaf">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-forest"
            />
            {eyebrow}
          </p>
        ) : null}
        <h2
          id={id}
          className="mt-3 font-display text-3xl leading-[1.12] tracking-[-0.01em] text-forest sm:text-4xl lg:text-[2.75rem]"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-4 max-w-xl text-sm leading-7 text-ink-soft sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
