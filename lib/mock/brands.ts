/**
 * Design-preview brands. These are invented placeholders, not real partners.
 */
export interface MockBrand {
  slug: string;
  name: string;
  tagline: string;
  monogram: string;
  productCount: number;
}

export const mockBrands: MockBrand[] = [
  {
    slug: "aurelle",
    name: "Aurelle",
    tagline: "Quiet luxury skincare",
    monogram: "A",
    productCount: 12,
  },
  {
    slug: "niora",
    name: "Niora",
    tagline: "Clinical calm, every day",
    monogram: "N",
    productCount: 9,
  },
  {
    slug: "lume",
    name: "Lumé",
    tagline: "Colour with a light touch",
    monogram: "L",
    productCount: 15,
  },
  {
    slug: "serein",
    name: "Serein",
    tagline: "Fragrance for slow evenings",
    monogram: "S",
    productCount: 6,
  },
  {
    slug: "maison-botanique",
    name: "Maison Botanique",
    tagline: "Botanical artistry",
    monogram: "MB",
    productCount: 8,
  },
  {
    slug: "kavya",
    name: "Kavya",
    tagline: "Sun care, reimagined",
    monogram: "K",
    productCount: 5,
  },
];
