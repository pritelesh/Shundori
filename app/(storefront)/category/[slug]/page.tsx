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
import { ProductVisual } from "@/components/products/product-visual";
import { pageMetadata } from "@/lib/seo";
import {
  countProductsByCategory,
  getCategoryBySlug,
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
  if (slug === STATIC_PARAM_PLACEHOLDER) return { title: "Category not found" };

  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: "Category not found" };
  }

  return pageMetadata({
    title: category.name,
    description:
      category.description || `Browse ${category.name} products at Shundori.`,
    path: `/category/${category.slug}`,
    noIndex: isDemoCatalogue(),
  });
}

export async function generateStaticParams() {
  return safeStaticParams(() => listCategories());
}

export default function CategoryPage(props: PageProps) {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}

async function CategoryContent({ params }: PageProps) {
  await connection();

  const { slug } = await params;
  if (slug === STATIC_PARAM_PLACEHOLDER) notFound();

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [categoryProducts, count, categories, brands] = await Promise.all([
    listProducts({ category: slug }),
    countProductsByCategory(slug),
    listCategories(),
    listBrands(),
  ]);

  const demo = isDemoCatalogue();

  return (
    <>
      <PageHeader
        eyebrow="Category"
        title={category.name}
        description={category.description}
      >
        <div className="relative mt-8 h-32 overflow-hidden rounded-2xl border border-warm-line bg-gradient-to-r from-soft-cream via-warm-white to-olive-soft sm:h-40">
          {category.imageUrl ? (
            <Image
              src={category.imageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 1200px"
              className="object-cover"
            />
          ) : null}
          {category.imageUrl ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-4 flex items-center sm:right-12"
            >
              <ProductVisual
                shape={category.visual}
                tone={category.tone}
                size="lg"
                className="text-[8rem] sm:text-[11rem]"
              />
            </div>
          )}
          <div className="absolute bottom-4 left-5 sm:bottom-6 sm:left-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-olive-deep">
              {count} {count === 1 ? "product" : "products"}
              {demo ? " · demonstration" : ""}
            </p>
          </div>
        </div>
      </PageHeader>

      <Container className="py-10 sm:py-14">
        <DemoNotice demo={demo} className="mb-8" />
        <CatalogBrowser
          products={categoryProducts}
          categories={categories}
          brands={brands}
          lockedCategory={slug}
          showSearch={false}
        />

        <div className="mt-14 border-t border-warm-line pt-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-olive-deep underline-offset-4 hover:underline"
          >
            Browse every category
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </>
  );
}
