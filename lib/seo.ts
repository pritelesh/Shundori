import type { Metadata } from "next";

import { currentPrice } from "@/lib/catalog-filter";
import { siteConfig } from "@/lib/site";
import type { CatalogProduct } from "@/types/product";

export const DEFAULT_OG_IMAGE = "/opengraph-image";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, siteConfig.url).toString();
}

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}

/** Shared canonical + Open Graph/Twitter metadata for indexable pages. */
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt = siteConfig.name,
  type = "website",
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const images = [absoluteUrl(image || DEFAULT_OG_IMAGE)];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title,
      description,
      images: images.map((value) => ({ url: value, alt: imageAlt })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function productMetadata(product: CatalogProduct): Metadata {
  const path = `/product/${product.slug}`;
  const image = product.images.find((item) => item.url)?.url ?? null;

  return pageMetadata({
    title: product.name,
    description:
      product.shortDescription ||
      product.description ||
      `${product.name} at ${siteConfig.name}.`,
    path,
    image,
    imageAlt: product.name,
  });
}

/** Product structured data. Prices are taka at the UI boundary only. */
export function productJsonLd(product: CatalogProduct) {
  const price = currentPrice(product);
  const image = product.images
    .map((item) => item.url)
    .filter((url): url is string => Boolean(url));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.sku ?? undefined,
    image: image.length > 0 ? image : undefined,
    brand: { "@type": "Brand", name: product.brand },
    aggregateRating:
      product.rating !== null && product.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          }
        : undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: siteConfig.currency,
      price: (price / 100).toFixed(2),
      availability:
        product.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };
}

/** Escapes characters that could terminate the JSON-LD script element. */
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
