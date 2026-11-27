export interface AdminMutationState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  productId?: string;
  storeLogoPath?: string;
}

export const initialMutationState: AdminMutationState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
