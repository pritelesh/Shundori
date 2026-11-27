import type {
  CatalogBrand,
  CatalogCategory,
  CatalogImage,
  CatalogProduct,
  ProductTone,
  ProductVisualShape,
} from "@/types/product";

/**
 * DEMONSTRATION CATALOGUE — Phase 3.
 *
 * Nothing in this file is verified product information. Brand names are used
 * accurately as plain text, but no official logos are reproduced and every
 * listing is marked `isDemo: true`. Benefits, ingredient notes and usage
 * guidance are illustrative copy for UI evaluation only. Replace this file
 * with Supabase-backed reads in `services/catalog.ts` when real data exists.
 */

export const mockBrands: CatalogBrand[] = [
  {
    slug: "garnier",
    name: "Garnier",
    introduction:
      "A familiar name in everyday skincare and hair care. This collection contains demonstration listings only.",
    monogram: "G",
  },
  {
    slug: "loreal-paris",
    name: "L'Oréal Paris",
    introduction:
      "A widely recognised beauty name presented here with illustrative listings for storefront evaluation.",
    monogram: "L",
  },
  {
    slug: "nivea",
    name: "Nivea",
    introduction:
      "Everyday moisturisers and body care shown as demonstration data, with no verified specifications.",
    monogram: "N",
  },
  {
    slug: "neutrogena",
    name: "Neutrogena",
    introduction:
      "Skincare-focused demonstration listings used to exercise filtering, search and product pages.",
    monogram: "Ne",
  },
  {
    slug: "cerave",
    name: "CeraVe",
    introduction:
      "A skincare brand represented here by placeholder listings and clearly labelled illustrative details.",
    monogram: "C",
  },
];

export const mockCategories: CatalogCategory[] = [
  {
    slug: "skincare",
    name: "Skincare",
    description: "Serums and treatments for a considered daily ritual.",
    visual: "dropper",
    tone: "emerald",
  },
  {
    slug: "haircare",
    name: "Haircare",
    description: "Shampoo and conditioning rituals for healthy-looking hair.",
    visual: "bottle",
    tone: "charcoal",
  },
  {
    slug: "makeup",
    name: "Makeup",
    description: "Colour, coverage and finishing touches for every mood.",
    visual: "lipstick",
    tone: "pink",
  },
  {
    slug: "face-wash",
    name: "Face Wash",
    description: "Gentle cleansers to begin and end the day well.",
    visual: "tube",
    tone: "emerald",
  },
  {
    slug: "moisturizer",
    name: "Moisturizer",
    description: "Hydration in textures suited to Bangladesh weather.",
    visual: "jar",
    tone: "cream",
  },
  {
    slug: "sunscreen",
    name: "Sunscreen",
    description: "Daily sun protection as the final step of your routine.",
    visual: "tube",
    tone: "cream",
  },
  {
    slug: "body-care",
    name: "Body Care",
    description: "Comforting lotions and creams from neck to toe.",
    visual: "bottle",
    tone: "pink",
  },
  {
    slug: "beauty-accessories",
    name: "Beauty Accessories",
    description: "The small tools that make a routine feel effortless.",
    visual: "compact",
    tone: "charcoal",
  },
];

interface CategoryCopy {
  benefits: string[];
  ingredients: string[];
  usageInstructions: string[];
}

/**
 * Illustrative detail copy. These are generic examples, not claims about any
 * real branded product.
 */
const categoryCopy: Record<string, CategoryCopy> = {
  skincare: {
    benefits: [
      "Illustrative: helps the skin feel hydrated and comfortable.",
      "Illustrative: lightweight texture for layering in a routine.",
      "Illustrative: suitable for an evening or morning ritual.",
    ],
    ingredients: [
      "Demonstration ingredient list — not verified product information.",
      "Replace with the verified INCI list before launch.",
    ],
    usageInstructions: [
      "Illustrative step: apply to clean skin before moisturiser.",
      "Demo guidance only — confirm directions with the supplier.",
    ],
  },
  haircare: {
    benefits: [
      "Illustrative: leaves hair feeling clean and manageable.",
      "Illustrative: designed for regular wash-day use.",
    ],
    ingredients: [
      "Demonstration ingredient list — not verified product information.",
      "Replace with the verified formula before launch.",
    ],
    usageInstructions: [
      "Illustrative step: work through wet hair, then rinse.",
      "Demo guidance only — confirm directions with the supplier.",
    ],
  },
  makeup: {
    benefits: [
      "Illustrative: an example finish for a colour collection.",
      "Illustrative: intended for everyday or occasion wear.",
    ],
    ingredients: [
      "Demonstration ingredient list — not verified product information.",
      "Replace with the verified shade and formula details before launch.",
    ],
    usageInstructions: [
      "Illustrative step: apply evenly to prepared skin or lips.",
      "Demo guidance only — confirm directions with the supplier.",
    ],
  },
  "face-wash": {
    benefits: [
      "Illustrative: a gentle daily cleansing step.",
      "Illustrative: rinse-off texture for humid weather.",
    ],
    ingredients: [
      "Demonstration ingredient list — not verified product information.",
      "Replace with the verified cleanser formula before launch.",
    ],
    usageInstructions: [
      "Illustrative step: massage over damp skin and rinse well.",
      "Demo guidance only — confirm directions with the supplier.",
    ],
  },
  moisturizer: {
    benefits: [
      "Illustrative: helps skin feel soft and hydrated.",
      "Illustrative: a comfortable base for daily routines.",
    ],
    ingredients: [
      "Demonstration ingredient list — not verified product information.",
      "Replace with the verified formula before launch.",
    ],
    usageInstructions: [
      "Illustrative step: smooth over face and neck after cleansing.",
      "Demo guidance only — confirm directions with the supplier.",
    ],
  },
  sunscreen: {
    benefits: [
      "Illustrative: an example daily sun-care step.",
      "Illustrative: lightweight finish for daytime use.",
    ],
    ingredients: [
      "Demonstration ingredient list — not verified product information.",
      "Replace with verified SPF and filter details before launch.",
    ],
    usageInstructions: [
      "Illustrative step: apply as the last step of the morning routine.",
      "Demo guidance only — confirm directions with the supplier.",
    ],
  },
  "body-care": {
    benefits: [
      "Illustrative: an everyday body-care ritual.",
      "Illustrative: rich texture for after-bath use.",
    ],
    ingredients: [
      "Demonstration ingredient list — not verified product information.",
      "Replace with the verified formula before launch.",
    ],
    usageInstructions: [
      "Illustrative step: massage over clean, dry skin.",
      "Demo guidance only — confirm directions with the supplier.",
    ],
  },
  "beauty-accessories": {
    benefits: [
      "Illustrative: a practical addition to a makeup kit.",
      "Illustrative: reusable tool for daily application.",
    ],
    ingredients: [
      "No cosmetic formula — demonstration accessory listing.",
      "Replace with verified material and care details before launch.",
    ],
    usageInstructions: [
      "Illustrative step: use with your usual makeup routine.",
      "Demo guidance only — confirm care instructions with the supplier.",
    ],
  },
};

const fallbackCopy: CategoryCopy = {
  benefits: ["Illustrative demonstration detail — replace with verified information."],
  ingredients: ["Demonstration ingredient list — not verified."],
  usageInstructions: ["Demo guidance only — confirm directions with the supplier."],
};

interface ProductSeed {
  id: string;
  name: string;
  slug: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  description: string;
  shortDescription: string;
  regularPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  isFeatured?: boolean;
  createdAt: string;
  visual: ProductVisualShape;
  tone: ProductTone;
  rating?: number | null;
  reviewCount?: number;
}

function createProduct(seed: ProductSeed): CatalogProduct {
  const copy = categoryCopy[seed.categorySlug] ?? fallbackCopy;
  const images: CatalogImage[] = [
    {
      url: null,
      alt: `${seed.name} — placeholder product artwork`,
      visual: seed.visual,
      tone: seed.tone,
    },
    {
      url: null,
      alt: `${seed.name} — alternate placeholder view`,
      visual: seed.tone === "pink" ? "compact" : "mist",
      tone: "cream",
    },
  ];

  return {
    ...seed,
    benefits: copy.benefits,
    ingredients: copy.ingredients,
    usageInstructions: copy.usageInstructions,
    images,
    isFeatured: seed.isFeatured ?? false,
    isActive: true,
    isDemo: true,
    rating: seed.rating ?? null,
    reviewCount: seed.reviewCount ?? 0,
  };
}

export const mockCatalogProducts: CatalogProduct[] = [
  createProduct({
    id: "demo-01",
    name: "Gentle Gel Face Wash",
    slug: "garnier-gentle-gel-face-wash",
    brand: "Garnier",
    brandSlug: "garnier",
    category: "Face Wash",
    categorySlug: "face-wash",
    description:
      "A demonstration face-wash listing used to show the Shundori catalogue, filtering and product detail experience. Product facts are illustrative and not verified.",
    shortDescription: "Illustrative daily cleanser listing for the demo catalogue.",
    regularPrice: 180000,
    salePrice: 145000,
    stockQuantity: 42,
    isFeatured: true,
    createdAt: "2026-10-18",
    visual: "tube",
    tone: "emerald",
    rating: 4.6,
    reviewCount: 128,
  }),
  createProduct({
    id: "demo-02",
    name: "Micellar Cleansing Water",
    slug: "garnier-micellar-cleansing-water",
    brand: "Garnier",
    brandSlug: "garnier",
    category: "Face Wash",
    categorySlug: "face-wash",
    description:
      "A demonstration cleanser listing for the storefront preview. No verified product specification is represented here.",
    shortDescription: "Demo micellar cleanser for UI evaluation.",
    regularPrice: 168000,
    salePrice: null,
    stockQuantity: 18,
    createdAt: "2026-09-02",
    visual: "bottle",
    tone: "cream",
    rating: 4.4,
    reviewCount: 76,
  }),
  createProduct({
    id: "demo-03",
    name: "Daily Moisturising Lotion",
    slug: "garnier-daily-moisturising-lotion",
    brand: "Garnier",
    brandSlug: "garnier",
    category: "Moisturizer",
    categorySlug: "moisturizer",
    description:
      "An illustrative moisturiser listing created to exercise category pages and cart quantity controls.",
    shortDescription: "Demo everyday moisturiser listing.",
    regularPrice: 265000,
    salePrice: 220000,
    stockQuantity: 25,
    createdAt: "2026-08-24",
    visual: "jar",
    tone: "cream",
    rating: 4.5,
    reviewCount: 94,
  }),
  createProduct({
    id: "demo-04",
    name: "Fresh Sun Gel SPF 50",
    slug: "garnier-fresh-sun-gel-spf-50",
    brand: "Garnier",
    brandSlug: "garnier",
    category: "Sunscreen",
    categorySlug: "sunscreen",
    description:
      "A demonstration sun-care listing. SPF details are illustrative and must be replaced with verified information before launch.",
    shortDescription: "Demo SPF listing with illustrative details.",
    regularPrice: 195000,
    salePrice: null,
    stockQuantity: 0,
    createdAt: "2026-07-11",
    visual: "tube",
    tone: "emerald",
    rating: 4.3,
    reviewCount: 51,
  }),
  createProduct({
    id: "demo-05",
    name: "Revitalift Renewal Serum",
    slug: "loreal-paris-revitalift-renewal-serum",
    brand: "L'Oréal Paris",
    brandSlug: "loreal-paris",
    category: "Skincare",
    categorySlug: "skincare",
    description:
      "A demonstration serum listing used for the featured-product rail and detail-page gallery. All details are illustrative.",
    shortDescription: "Featured demo serum listing for the storefront.",
    regularPrice: 450000,
    salePrice: 385000,
    stockQuantity: 12,
    isFeatured: true,
    createdAt: "2026-11-02",
    visual: "dropper",
    tone: "emerald",
    rating: 4.8,
    reviewCount: 212,
  }),
  createProduct({
    id: "demo-06",
    name: "Colour Rich Lipstick",
    slug: "loreal-paris-colour-rich-lipstick",
    brand: "L'Oréal Paris",
    brandSlug: "loreal-paris",
    category: "Makeup",
    categorySlug: "makeup",
    description:
      "An illustrative lipstick listing for the makeup category. Shade and formula details are not verified.",
    shortDescription: "Demo lipstick listing for the makeup edit.",
    regularPrice: 190000,
    salePrice: 155000,
    stockQuantity: 30,
    createdAt: "2026-10-29",
    visual: "lipstick",
    tone: "pink",
    rating: 4.7,
    reviewCount: 143,
  }),
  createProduct({
    id: "demo-07",
    name: "Smooth Daily Shampoo",
    slug: "loreal-paris-smooth-daily-shampoo",
    brand: "L'Oréal Paris",
    brandSlug: "loreal-paris",
    category: "Haircare",
    categorySlug: "haircare",
    description:
      "A demonstration shampoo listing used to populate haircare search and brand filtering.",
    shortDescription: "Demo everyday shampoo listing.",
    regularPrice: 240000,
    salePrice: null,
    stockQuantity: 21,
    createdAt: "2026-09-19",
    visual: "bottle",
    tone: "charcoal",
    rating: 4.4,
    reviewCount: 87,
  }),
  createProduct({
    id: "demo-08",
    name: "UV Defense SPF 50",
    slug: "loreal-paris-uv-defense-spf-50",
    brand: "L'Oréal Paris",
    brandSlug: "loreal-paris",
    category: "Sunscreen",
    categorySlug: "sunscreen",
    description:
      "A demonstration sunscreen listing with illustrative SPF copy. Verify all sun-care claims before launch.",
    shortDescription: "Illustrative SPF listing for the demo catalogue.",
    regularPrice: 310000,
    salePrice: 265000,
    stockQuantity: 16,
    createdAt: "2026-06-14",
    visual: "tube",
    tone: "cream",
    rating: 4.6,
    reviewCount: 105,
  }),
  createProduct({
    id: "demo-09",
    name: "Soft Light Moisturiser",
    slug: "nivea-soft-light-moisturiser",
    brand: "Nivea",
    brandSlug: "nivea",
    category: "Moisturizer",
    categorySlug: "moisturizer",
    description:
      "A demonstration moisturisers listing included in best-seller and discount previews.",
    shortDescription: "Demo light moisturiser listing.",
    regularPrice: 225000,
    salePrice: 185000,
    stockQuantity: 35,
    isFeatured: true,
    createdAt: "2026-10-05",
    visual: "jar",
    tone: "cream",
    rating: 4.7,
    reviewCount: 189,
  }),
  createProduct({
    id: "demo-10",
    name: "Nourishing Body Lotion",
    slug: "nivea-nourishing-body-lotion",
    brand: "Nivea",
    brandSlug: "nivea",
    category: "Body Care",
    categorySlug: "body-care",
    description:
      "An illustrative body-care listing used to verify the body-care category and related products.",
    shortDescription: "Demo body lotion listing.",
    regularPrice: 210000,
    salePrice: null,
    stockQuantity: 27,
    createdAt: "2026-08-30",
    visual: "bottle",
    tone: "pink",
    rating: 4.5,
    reviewCount: 66,
  }),
  createProduct({
    id: "demo-11",
    name: "Gentle Face Cleanser",
    slug: "nivea-gentle-face-cleanser",
    brand: "Nivea",
    brandSlug: "nivea",
    category: "Face Wash",
    categorySlug: "face-wash",
    description:
      "A demonstration cleanser listing for filtering and low-stock status previews.",
    shortDescription: "Demo gentle cleanser listing.",
    regularPrice: 160000,
    salePrice: 130000,
    stockQuantity: 50,
    createdAt: "2026-05-21",
    visual: "tube",
    tone: "emerald",
    rating: 4.2,
    reviewCount: 73,
  }),
  createProduct({
    id: "demo-12",
    name: "Rose Lip Balm",
    slug: "nivea-rose-lip-balm",
    brand: "Nivea",
    brandSlug: "nivea",
    category: "Makeup",
    categorySlug: "makeup",
    description:
      "An illustrative lip-care listing used in the makeup category. Shade and formula are not verified.",
    shortDescription: "Demo lip balm listing.",
    regularPrice: 85000,
    salePrice: null,
    stockQuantity: 40,
    createdAt: "2026-07-02",
    visual: "lipstick",
    tone: "pink",
    rating: 4.4,
    reviewCount: 58,
  }),
  createProduct({
    id: "demo-13",
    name: "Hydro Boost Serum",
    slug: "neutrogena-hydro-boost-serum",
    brand: "Neutrogena",
    brandSlug: "neutrogena",
    category: "Skincare",
    categorySlug: "skincare",
    description:
      "A demonstration serum listing with illustrative benefits and ingredient notes.",
    shortDescription: "Featured demo hydrating serum.",
    regularPrice: 375000,
    salePrice: 320000,
    stockQuantity: 14,
    isFeatured: true,
    createdAt: "2026-11-12",
    visual: "dropper",
    tone: "emerald",
    rating: 4.8,
    reviewCount: 241,
  }),
  createProduct({
    id: "demo-14",
    name: "Oil Free Moisturiser",
    slug: "neutrogena-oil-free-moisturiser",
    brand: "Neutrogena",
    brandSlug: "neutrogena",
    category: "Moisturizer",
    categorySlug: "moisturizer",
    description:
      "An illustrative moisturiser listing included in the demo catalogue for category browsing.",
    shortDescription: "Demo oil-free moisturiser listing.",
    regularPrice: 275000,
    salePrice: null,
    stockQuantity: 19,
    createdAt: "2026-09-08",
    visual: "jar",
    tone: "cream",
    rating: 4.6,
    reviewCount: 112,
  }),
  createProduct({
    id: "demo-15",
    name: "Deep Clean Face Wash",
    slug: "neutrogena-deep-clean-face-wash",
    brand: "Neutrogena",
    brandSlug: "neutrogena",
    category: "Face Wash",
    categorySlug: "face-wash",
    description:
      "A demonstration face-wash listing for the search and sorting preview.",
    shortDescription: "Demo deep-clean cleanser listing.",
    regularPrice: 205000,
    salePrice: 175000,
    stockQuantity: 33,
    createdAt: "2026-08-16",
    visual: "tube",
    tone: "emerald",
    rating: 4.5,
    reviewCount: 154,
  }),
  createProduct({
    id: "demo-16",
    name: "Sensitive Sun SPF 50",
    slug: "neutrogena-sensitive-sun-spf-50",
    brand: "Neutrogena",
    brandSlug: "neutrogena",
    category: "Sunscreen",
    categorySlug: "sunscreen",
    description:
      "A demonstration sun-care listing with low-stock status. SPF copy is illustrative only.",
    shortDescription: "Demo SPF listing with low stock.",
    regularPrice: 290000,
    salePrice: null,
    stockQuantity: 8,
    createdAt: "2026-10-22",
    visual: "tube",
    tone: "cream",
    rating: 4.7,
    reviewCount: 83,
  }),
  createProduct({
    id: "demo-17",
    name: "Hydrating Facial Cleanser",
    slug: "cerave-hydrating-facial-cleanser",
    brand: "CeraVe",
    brandSlug: "cerave",
    category: "Face Wash",
    categorySlug: "face-wash",
    description:
      "An illustrative cleanser listing used in the brand collection and best-seller sections.",
    shortDescription: "Demo hydrating cleanser listing.",
    regularPrice: 280000,
    salePrice: 245000,
    stockQuantity: 22,
    createdAt: "2026-10-11",
    visual: "tube",
    tone: "emerald",
    rating: 4.8,
    reviewCount: 198,
  }),
  createProduct({
    id: "demo-18",
    name: "Daily Moisturising Lotion",
    slug: "cerave-daily-moisturising-lotion",
    brand: "CeraVe",
    brandSlug: "cerave",
    category: "Moisturizer",
    categorySlug: "moisturizer",
    description:
      "A demonstration daily moisturiser listing with illustrative details for UI review.",
    shortDescription: "Featured demo daily lotion listing.",
    regularPrice: 310000,
    salePrice: null,
    stockQuantity: 11,
    isFeatured: true,
    createdAt: "2026-11-20",
    visual: "jar",
    tone: "cream",
    rating: 4.9,
    reviewCount: 276,
  }),
  createProduct({
    id: "demo-19",
    name: "Renewing Night Serum",
    slug: "cerave-renewing-night-serum",
    brand: "CeraVe",
    brandSlug: "cerave",
    category: "Skincare",
    categorySlug: "skincare",
    description:
      "A demonstration night-serum listing with a low-stock state for testing availability filters.",
    shortDescription: "Demo night serum with low stock.",
    regularPrice: 480000,
    salePrice: 420000,
    stockQuantity: 6,
    createdAt: "2026-11-24",
    visual: "dropper",
    tone: "charcoal",
    rating: 4.7,
    reviewCount: 91,
  }),
  createProduct({
    id: "demo-20",
    name: "Soft Makeup Sponge Set",
    slug: "cerave-soft-makeup-sponge-set",
    brand: "CeraVe",
    brandSlug: "cerave",
    category: "Beauty Accessories",
    categorySlug: "beauty-accessories",
    description:
      "A demonstration accessory listing. Material and care details are illustrative, not verified.",
    shortDescription: "Demo makeup sponge set listing.",
    regularPrice: 120000,
    salePrice: 95000,
    stockQuantity: 60,
    createdAt: "2026-09-27",
    visual: "compact",
    tone: "pink",
    rating: 4.3,
    reviewCount: 44,
  }),
  createProduct({
    id: "demo-21",
    name: "Precision Brush Set",
    slug: "nivea-precision-brush-set",
    brand: "Nivea",
    brandSlug: "nivea",
    category: "Beauty Accessories",
    categorySlug: "beauty-accessories",
    description:
      "An illustrative accessory listing for the beauty-accessories category page.",
    shortDescription: "Demo brush set listing.",
    regularPrice: 145000,
    salePrice: null,
    stockQuantity: 28,
    createdAt: "2026-08-04",
    visual: "compact",
    tone: "charcoal",
    rating: 4.2,
    reviewCount: 37,
  }),
  createProduct({
    id: "demo-22",
    name: "Silk Repair Hair Mask",
    slug: "loreal-paris-silk-repair-hair-mask",
    brand: "L'Oréal Paris",
    brandSlug: "loreal-paris",
    category: "Haircare",
    categorySlug: "haircare",
    description:
      "A demonstration hair-mask listing for the haircare category and new-arrivals rail.",
    shortDescription: "Demo hair mask listing.",
    regularPrice: 275000,
    salePrice: 230000,
    stockQuantity: 17,
    createdAt: "2026-11-16",
    visual: "jar",
    tone: "pink",
    rating: 4.6,
    reviewCount: 69,
  }),
  createProduct({
    id: "demo-23",
    name: "Volume Daily Shampoo",
    slug: "garnier-volume-daily-shampoo",
    brand: "Garnier",
    brandSlug: "garnier",
    category: "Haircare",
    categorySlug: "haircare",
    description:
      "An illustrative shampoo listing used for brand and category filter combinations.",
    shortDescription: "Demo volume shampoo listing.",
    regularPrice: 230000,
    salePrice: 195000,
    stockQuantity: 24,
    createdAt: "2026-07-28",
    visual: "bottle",
    tone: "charcoal",
    rating: 4.3,
    reviewCount: 62,
  }),
  createProduct({
    id: "demo-24",
    name: "Calming Body Cream",
    slug: "cerave-calming-body-cream",
    brand: "CeraVe",
    brandSlug: "cerave",
    category: "Body Care",
    categorySlug: "body-care",
    description:
      "A demonstration body-care listing with illustrative details for the product detail page.",
    shortDescription: "Demo body cream listing.",
    regularPrice: 295000,
    salePrice: null,
    stockQuantity: 13,
    createdAt: "2026-11-08",
    visual: "jar",
    tone: "cream",
    rating: 4.5,
    reviewCount: 78,
  }),
];
