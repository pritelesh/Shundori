import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

import { Container } from "./container";

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <section className={cn("border-b border-sage-light bg-cream", className)}>
      <Container className="py-14 sm:py-20">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-leaf">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full bg-forest"
          />
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] tracking-[-0.01em] text-forest sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-soft sm:text-base">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </Container>
    </section>
  );
}
