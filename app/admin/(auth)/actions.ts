"use server";

import { redirect } from "next/navigation";

import type { AdminLoginState } from "@/app/admin/(auth)/login-state";
import {
  errorMessage,
  fieldErrorsOf,
  readString,
} from "@/lib/admin-validation";
import { signInAdmin, signOutAdmin } from "@/services/admin-auth";

function safeNext(value: string): string {
  if (!value.startsWith("/admin") || value.startsWith("//")) {
    return "/admin/dashboard";
  }
  return value;
}

export async function adminLoginAction(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = readString(formData, "email");
  const password = typeof formData.get("password") === "string"
    ? String(formData.get("password"))
    : "";
  const next = safeNext(readString(formData, "next"));

  try {
    await signInAdmin(email, password);
  } catch (error) {
    return {
      status: "error",
      message: errorMessage(error),
      fieldErrors: fieldErrorsOf(error),
    };
  }

  redirect(next);
}

export async function adminLogoutAction(): Promise<void> {
  await signOutAdmin();
  redirect("/admin/login");
}
