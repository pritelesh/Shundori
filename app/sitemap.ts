import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { getSitemapUrls } from "@/services/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls = await getSitemapUrls();
  return urls.map(({ path, lastModified }) => ({
    url: absoluteUrl(path),
    lastModified: lastModified ? new Date(lastModified) : undefined,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path.startsWith("/product/") ? 0.8 : 0.6,
  }));
}
