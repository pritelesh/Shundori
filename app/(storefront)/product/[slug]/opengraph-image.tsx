import { ImageResponse } from "next/og";
import { connection } from "next/server";

import { currentPrice } from "@/lib/catalog-filter";
import {
  getProductBySlug,
  listProducts,
  safeStaticParams,
  STATIC_PARAM_PLACEHOLDER,
} from "@/services/catalog";
import { formatPrice } from "@/utils/format";

export const alt = "Shundori product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const forest = "#14261A";
const mist = "#EEF0E4";
const leaf = "#3A7335";

export async function generateStaticParams() {
  return safeStaticParams(() => listProducts());
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Keep the rendered offer price current instead of freezing it at build time.
  await connection();

  const { slug } = await params;
  const product =
    slug === STATIC_PARAM_PLACEHOLDER ? undefined : await getProductBySlug(slug);
  const title = product?.name ?? "Shundori";
  const subtitle = product?.brand ?? "Cosmetics & skincare";
  const price = product ? formatPrice(currentPrice(product)) : "COD available";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: mist,
          padding: 80,
          color: forest,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            letterSpacing: 6,
            color: leaf,
          }}
        >
          <span>Shundori</span>
          <span>{subtitle}</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 34 ? 62 : 84,
            lineHeight: 1.08,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 42,
            color: leaf,
          }}
        >
          {price}
        </div>
      </div>
    ),
    size,
  );
}
