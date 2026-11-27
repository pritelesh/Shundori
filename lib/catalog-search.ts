export interface SearchSuggestion {
  type: "product" | "brand" | "category";
  label: string;
  href: string;
  detail?: string;
}

/** Pure client-side suggestion matching over a server-provided catalogue index. */
export function getSearchSuggestions(
  index: readonly SearchSuggestion[],
  query: string,
  limit = 6,
): SearchSuggestion[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  return index
    .filter((item) =>
      `${item.label} ${item.detail ?? ""}`.toLowerCase().includes(term),
    )
    .slice(0, limit);
}
