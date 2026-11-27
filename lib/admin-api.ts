import { ValidationError } from "@/lib/admin-validation";
import { AuthorizationError } from "@/services/authorization";

/**
 * Converts privileged service failures into admin API responses without
 * leaking internal details. Unauthenticated requests get 401, rejected roles
 * get 403, validation failures get a field-safe 400, and upstream failures are
 * logged server-side but returned as a fixed generic 400.
 */
export function adminApiError(error: unknown, fallback: string): Response {
  if (error instanceof AuthorizationError) {
    return Response.json(
      { error: error.message },
      { status: error.status },
    );
  }

  if (error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  console.error("Admin API request failed:", error);
  return Response.json({ error: fallback }, { status: 400 });
}
