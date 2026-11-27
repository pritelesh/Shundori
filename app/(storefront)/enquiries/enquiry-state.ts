export interface EnquiryMutationState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
}

export const initialEnquiryState: EnquiryMutationState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
