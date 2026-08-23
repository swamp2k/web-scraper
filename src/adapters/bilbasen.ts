import { parseDanishNumber, readTextLimited } from "../http.js";
import type { Listing, ScraperAdapter } from "../types.js";

const HOSTS = new Set(["bilbasen.dk", "www.bilbasen.dk"]);

type PropertyValue = { displayTextShort?: string };
type BilbasenItem = {
  id?: string | number;
  uri?: string;
  make?: string;
  model?: string;
  variant?: string;
  description?: string;
  sellerType?: string;
  dealer?: { name?: string };
  price?: { price?: string | number; displayPrice?: string };
  location?: { zipCode?: string | number; city?: string; region?: string };
  properties?: Record<string, PropertyValue>;
};
type ListingData = {
  hits?: number;
  listings?: BilbasenItem[];
  pagination?: { next?: { link?: string } };
};
type BilbasenNextData = {
  props?: { pageProps?: { dehydratedState?: { queries?: Array<{ state?: { data?: ListingData } }> } } };
};

export const bilbasenAdapter: ScraperAdapter = {
  id: "bilbasen",
  category: "car",
  maxPages: 50,
  canHandle(url) {
    return HOSTS.has(url.hostname.toLowerCase());
  },
  async scrape(startUrl, options, env) {
    const maxPages = Math.min(options.maxPages, this.maxPages);
    const listings = new Map<string, Listing>();
    let currentUrl: URL | null = new URL(startUrl);
    let pagesFetched = 0;
    let totalListings: number | undefined;

    while (currentUrl && pagesFetched < maxPages) {
      const response = await env.BROWSER.quickAction("content", {
        url: currentUrl.toString(),
        setExtraHTTPHeaders: { "Accept-Language": "da-DK,da;q=0.9" },
        rejectResourceTypes: ["image", "media", "font"],
        gotoOptions: { waitUntil: "domcontentloaded", timeout: 30000 },
        waitForSelector: { selector: "#__NEXT_DATA__", timeout: 10000 }
      });

      if (!response.ok) throw new Error(`Bilbasen browser render returned HTTP ${response.status}`);
      const html = await readTextLimited(response, 8_000_000);
      const pageData = extractPageData(html);
      if (!pageData) break;

      pagesFetched += 1;
      totalListings ??= pageData.hits;
      for (const item of pageData.listings ?? []) {
        const listing = mapListing(item, currentUrl);
        listings.set(listing.id, listing);
      }

      currentUrl = pageData.pagination?.next?.link
        ? new URL(pageData.pagination.next.link, currentUrl)
        : null;
    }

    return {
      source: this.id,
      category: this.category,
      listings: [...listings.values()],
      pagesFetched,
      totalListings
    };
  }
};

function extractPageData(html: string): ListingData | null {
  const match = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;

  const data = JSON.parse(match[1]) as BilbasenNextData;
  const queries = data.props?.pageProps?.dehydratedState?.queries ?? [];
  for (const query of queries) {
    const pageData = query.state?.data;
    if (pageData?.listings) return pageData;
  }
  return null;
}

function mapListing(item: BilbasenItem, pageUrl: URL): Listing {
  const link = item.uri ? new URL(item.uri, pageUrl).toString() : pageUrl.toString();
  const id = String(item.id ?? link.match(/(\d+)(?:\/?(?:\?|$))/)?.[1] ?? link);
  const p = item.properties ?? {};
  const prop = (key: string) => p[key]?.displayTextShort;
  const location = [item.location?.zipCode, item.location?.city].filter(Boolean).join(" ") || undefined;
  const price = typeof item.price?.price === "number"
    ? item.price.price
    : parseDanishNumber(String(item.price?.price ?? ""));
  const yearText = prop("firstregistrationdate");
  const mileageText = prop("mileage");

  return {
    id,
    source: "bilbasen",
    category: "car",
    title: [item.make, item.model, item.variant].filter(Boolean).join(" "),
    url: link,
    price,
    priceText: item.price?.displayPrice,
    year: parseDanishNumber(yearText?.slice(-4)),
    mileageKm: parseDanishNumber(mileageText),
    location,
    sellerType: item.sellerType,
    dealer: item.dealer?.name,
    attributes: {
      fuel: prop("fueltype") ?? null,
      gearbox: prop("geartype") ?? null,
      hp: prop("hk") ?? null,
      kmPerLitre: prop("kml") ?? null,
      ownerTax: prop("moth") ?? null,
      trailerWeight: prop("trailer") ?? null,
      region: item.location?.region ?? null,
      description: item.description ?? null
    }
  };
}
