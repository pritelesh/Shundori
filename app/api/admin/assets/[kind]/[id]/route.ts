import { revalidatePath } from "next/cache";

import { adminApiError } from "@/lib/admin-api";
import { assertUuid } from "@/lib/admin-validation";
import {
  removeAdminAsset,
  uploadAdminAsset,
} from "@/services/admin-assets";
import { requireAdmin } from "@/services/authorization";

interface RouteContext {
  params: Promise<{ kind: string; id: string }>;
}

function bucketFor(kind: string): "brand-assets" | "category-assets" | null {
  if (kind === "brands") return "brand-assets";
  if (kind === "categories") return "category-assets";
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { kind, id } = await context.params;
    const bucket = bucketFor(kind);
    if (!bucket) return Response.json({ error: "Unsupported asset type." }, { status: 400 });
    assertUuid(id);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    const result = await uploadAdminAsset(bucket, id, file);
    revalidatePath("/", "layout");
    return Response.json({ result, warning: result.warning });
  } catch (error) {
    return adminApiError(error, "Upload failed.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { kind, id } = await context.params;
    const bucket = bucketFor(kind);
    if (!bucket) return Response.json({ error: "Unsupported asset type." }, { status: 400 });
    assertUuid(id);

    const outcome = await removeAdminAsset(bucket, id);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, warning: outcome.warning });
  } catch (error) {
    return adminApiError(error, "Removal failed.");
  }
}
