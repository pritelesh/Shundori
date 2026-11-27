"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui/button";

export interface RouteErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
  message?: string;
}

export function RouteError({
  error,
  retry,
  message = "Something went wrong while loading this page. Please try again in a moment.",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-pink-soft text-charcoal">
        <AlertCircle className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-display text-3xl text-charcoal sm:text-4xl">
        We couldn’t load this page.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">{message}</p>
      <button
        type="button"
        onClick={retry}
        className={buttonStyles({ size: "md", className: "mt-8" })}
      >
        Try again
      </button>
    </Container>
  );
}
