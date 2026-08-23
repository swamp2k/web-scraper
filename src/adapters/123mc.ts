import { cleanText, parseDanishNumber, readTextLimited } from "../http.js";
import type { Listing, ScrapeResult, ScraperAdapter } from "../types.js";

const HOSTS = new Set(["123mc.dk", "www.123mc.dk"]);
const LISTING_PATH = /\/brugt\/mc\/.+?\/(?:til-salg\/)?(\d+)(?:[?#]|$)/i;

export const mc123Adapter: ScraperAdapter = {
  id: "123mc",
  category: "motorcycle",
  maxPages: 250,
  canHandle(url) {
    return HOSTS.has(url.hostname.toLowerCase()) && url.pathname.startsWith("/brugt/");
  },
  async scrape(startUrl, options) {
    const maxPages = Math.min(options.maxPages, this.maxPages);
    const listings = new Map<string, Listing>();
    let currentUrl: URL | null = new URL(startUrl);
    let pagesFetched = 0;
    let totalListings: number | undefined;

    while (currentUrl && pagesFetched < maxPages) {
      const response = await fetch(currentUrl, {
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "da-DK,da;q=0.9,en;q=0.5",
          "User-Agent": "Mozilla/5.0 (compatible; WebScraper/1.0)"
        },
        redirect: "follow"
      });

      if (!response.ok) throw new Error(`123mc returned HTTP ${response.status}`);
      const html = await readTextLimited(response);
      pagesFetched += 1;

      totalListings ??= extractTotal(html);
      for (const listing of extractListings(html, currentUrl)) listings.set(listing.id, listing);
      currentUrl = nextPageUrl(html, currentUrl);
    }

    return {
      source: this.id,
      category: this.category,
      listings: [...listings.values()],
      pagesFetched,
      totalListings
    } satisfies ScrapeResult;
  }
};

export function extractListings(html: string, pageUrl: URL): Listing[] {
  const chunks = html.split(/<div class=["']col-item["']>/i).slice(1);
  const listings: Listing[] = [];

  for (const chunk of chunks) {
    const linkMatch = chunk.match(/href=["']([^"']*\/brugt\/mc\/[^"']+?\/\d+)["']/i);
    if (!linkMatch) continue;

    const absoluteUrl = new URL(linkMatch[1], pageUrl);
    absoluteUrl.hash = "";
    const idMatch = absoluteUrl.pathname.match(LISTING_PATH);
    if (!idMatch) continue;

    const titleMatch = chunk.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i)
      ?? chunk.match(/class=["']a-text-brand-link["'][^>]*title=["']([^"']+)["']/i);
    const yearKm = chunk.match(/>(\d{4}),\s*([\d.]+)\s*km\s*</i);
    const sellerLocation = chunk.match(/class=["']postnr-landels-text-gallery["'][^>]*>\s*(Privat|Forhandler)\s*<br\s*\/?>\s*<div class=["']postnr-text-gallery["']>([\s\S]*?)<\/div>/i);
    const priceMatch = chunk.match(/class=["'][^"']*price-wrp-gallery[^"']*["'][^>]*>\s*Kr\.\s*([\d.]+)/i);
    const imageMatch = chunk.match(/data-src=["']([^"']+)["']/i);

    const title = cleanText(titleMatch?.[1] ?? "");
    const year = parseDanishNumber(yearKm?.[1]);
    const mileageKm = parseDanishNumber(yearKm?.[2]);
    const price = parseDanishNumber(priceMatch?.[1]);
    const sellerType = sellerLocation?.[1];
    const location = sellerLocation ? cleanText(sellerLocation[2]) : undefined;
    const imageUrl = imageMatch ? new URL(imageMatch[1], pageUrl).toString() : undefined;

    listings.push({
      id: idMatch[1],
      source: "123mc",
      category: "motorcycle",
      title,
      url: absoluteUrl.toString(),
      price,
      priceText: price === undefined ? undefined : `${price.toLocaleString("da-DK")} kr.`,
      year,
      mileageKm,
      location,
      sellerType,
      imageUrl,
      attributes: {}
    });
  }

  return listings;
}

function extractTotal(html: string): number | undefined {
  const match = html.match(/<title[^>]*>[^<]*?-\s*([\d.]+)\s+brugte\s+til\s+salg/i)
    ?? html.match(/>Alle\s*(?:&nbsp;|\s)*<span class=["']badge["']>([\d.]+)<\/span>/i);
  return parseDanishNumber(match?.[1]);
}

function nextPageUrl(html: string, currentUrl: URL): URL | null {
  const currentOffset = parseDanishNumber(currentUrl.searchParams.get("p") ?? "0") ?? 0;
  let nextOffset: number | undefined;
  let nextHref: string | undefined;

  for (const match of html.matchAll(/href=["']([^"']*[?&]p=(\d+)[^"']*)["']/gi)) {
    const offset = Number(match[2]);
    if (offset > currentOffset && (nextOffset === undefined || offset < nextOffset)) {
      nextOffset = offset;
      nextHref = match[1].replace(/&amp;/g, "&");
    }
  }

  return nextHref ? new URL(nextHref, currentUrl) : null;
}
