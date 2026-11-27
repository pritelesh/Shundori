"use client";

import { RouteError } from "@/components/ui/route-error";

export default function StorefrontError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={retry}
      message="Something went wrong while reading the catalogue. Please try again in a moment."
    />
  );
}
