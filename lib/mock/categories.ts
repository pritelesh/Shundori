/**
 * Design-preview categories. Placeholder counts only — no catalogue exists yet.
 */
export interface MockCategory {
  slug: string;
  name: string;
  description: string;
  productCount: number;
  icon: "droplets" | "palette" | "sparkles" | "flower";
}

export const mockCategories: MockCategory[] = [
  {
    slug: "skincare",
    name: "Skincare",
    description: "Cleansers, serums and moisturisers for a considered ritual.",
    productCount: 48,
    icon: "droplets",
  },
  {
    slug: "makeup",
    name: "Makeup",
    description: "Buildable colour and soft finishes for every mood.",
    productCount: 36,
    icon: "palette",
  },
  {
    slug: "fragrance",
    name: "Fragrance",
    description: "Florals and warm woods chosen to linger, never shout.",
    productCount: 14,
    icon: "sparkles",
  },
  {
    slug: "body-bath",
    name: "Body & Bath",
    description: "Everyday nourishment from neck to toe.",
    productCount: 22,
    icon: "flower",
  },
];
