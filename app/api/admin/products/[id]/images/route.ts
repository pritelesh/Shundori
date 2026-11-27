import { revalidatePath } from "next/cache";

import { adminApiError } from "@/lib/admin-api";
import { assertUuid } from "@/lib/admin-validation";
import { requireAdmin } from "@/services/authorization";
import {
  deleteProductImage,
  replaceProductImage,
  setProductImageCover,
  uploadProductImage,
  validateProductImageFile,
  type ProductImageResult,
} from "@/services/images";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function filesFrom(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    assertUuid(id);

    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "upload");
    const results: ProductImageResult[] = [];
    const warnings: string[] = [];
    const failures: string[] = [];

    if (intent === "upload") {
      const files = filesFrom(formData, "files");
      if (files.length === 0) return jsonError("Choose at least one image.", 400);

      // Validate every file before writing anything so a bad later file cannot
      // leave an earlier upload partially applied.
      for (const file of files) {
        try {
          validateProductImageFile(file);
        } catch (error) {
          return adminApiError(error, "One or more images are invalid.");
        }
      }

      for (const file of files) {
        try {
          results.push(await uploadProductImage({ productId: id, file }));
        } catch (error) {
          console.error("Product image upload failed:", error);
          failures.push(`Could not upload ${file.name}.`);
        }
      }
    } else if (intent === "replace") {
      const currentPath = String(formData.get("path") ?? "");
      const [file] = filesFrom(formData, "file");
      if (!currentPath || !file) {
        return jsonError("A current image and a replacement file are required.", 400);
      }
      const result = await replaceProductImage({ productId: id, currentPath, file });
      results.push(result);
      if (result.warning) warnings.push(result.warning);
    } else if (intent === "delete") {
      const path = String(formData.get("path") ?? "");
      if (!path) return jsonError("An image path is required.", 400);
      const outcome = await deleteProductImage({ productId: id, path });
      if (outcome.warning) warnings.push(outcome.warning);
    } else if (intent === "setCover") {
      const path = String(formData.get("path") ?? "");
      if (!path) return jsonError("An image path is required.", 400);
      results.push(await setProductImageCover({ productId: id, path }));
    } else {
      return jsonError("Unsupported image operation.", 400);
    }

    revalidatePath(`/admin/products/${id}/edit`);
    revalidatePath("/", "layout");
    return Response.json({ results, warnings, failures });
  } catch (error) {
    return adminApiError(error, "Image operation failed.");
  }
}
