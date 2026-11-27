"use client";

import { RouteError } from "@/components/ui/route-error";

export default function AdminRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={reset}
      message="The admin dashboard could not load this data. Check your Supabase configuration and try again."
    />
  );
}
