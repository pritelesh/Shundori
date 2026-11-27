import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { CatalogFallback } from "@/components/catalog/catalog-fallback";
import { DemoNotice } from "@/components/catalog/demo-notice";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { pageMetadata } from "@/lib/seo";
import {
  countProductsByBrand,
  getBrandBySlug,
  isDemoCatalogue,
  listBrands,
  listCategories,
  listProducts,
  safeStaticParams,
  STATIC_PARAM_PLACEHOLDER,
} from "@/services/catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === STATIC_PARAM_PLACEHOLDER) return { title: "Brand not found" };

  const brand = await getBrandBySlug(slug);

  if (!brand) {
    return { title: "Brand not found" };
  }

  return pageMetadata({
    title: `${brand.name} products`,
    description: isDemoCatalogue()
      ? `Browse demonstration listings for ${brand.name} in the Shundori catalogue.`
      : `Browse ${brand.name} products in the Shundori collection.`,
    path: `/brand/${brand.slug}`,
    noIndex: isDemoCatalogue(),
  });
}

export async function generateStaticParams() {
  return safeStaticParams(() => listBrands());
}

export default function BrandPage(props: PageProps) {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <BrandContent {...props} />
    </Suspense>
  );
}

async function BrandContent({ params }: PageProps) {
  await connection();

  const { slug } = await params;
  if (slug === STATIC_PARAM_PLACEHOLDER) notFound();

  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const [brandProducts, count, brands, categories] = await Promise.all([
    listProducts({ brand: slug }),
    countProductsByBrand(slug),
    listBrands(),
    listCategories(),
  ]);

  const demo = isDemoCatalogue();

  return (
    <>
      <PageHeader eyebrow="Brand collection" title={brand.name} description={brand.introduction}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-warm-line bg-warm-white font-display text-2xl text-olive-deep">
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-2"
              />
            ) : (
              brand.monogram
            )}
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-olive-deep">
              {count} {count === 1 ? "product" : "products"}
              {demo ? " · demonstration" : ""}
            </p>
            <p className="mt-1 text-sm text-taupe">
              {brand.logoUrl
                ? "Official logo supplied by the administrator."
                : "Brand name shown as text unless official logo artwork is supplied."}
            </p>
          </div>
        </div>
      </PageHeader>

      <Container className="py-10 sm:py-14">
        <DemoNotice demo={demo} className="mb-8" />
        <CatalogBrowser
          products={brandProducts}
          categories={categories}
          brands={brands}
          lockedBrand={slug}
        />

        <div className="mt-14 border-t border-warm-line pt-8">
          <Link
            href="/#brands"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-olive-deep underline-offset-4 hover:underline"
          >
            See all featured brands
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </>
  );
}
