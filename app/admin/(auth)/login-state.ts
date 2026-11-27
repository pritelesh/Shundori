export interface AdminLoginState {
  status: "idle" | "error";
  message: string;
  fieldErrors: Record<string, string>;
}

export const initialLoginState: AdminLoginState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
