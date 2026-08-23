export type ListingValue = string | number | boolean | null;

export interface Listing {
  id: string;
  source: string;
  category: string;
  title: string;
  url: string;
  price?: number;
  priceText?: string;
  year?: number;
  mileageKm?: number;
  location?: string;
  sellerType?: string;
  dealer?: string;
  imageUrl?: string;
  attributes: Record<string, ListingValue>;
}

export interface ScrapeOptions {
  maxPages: number;
}

export interface ScrapeResult {
  source: string;
  category: string;
  listings: Listing[];
  pagesFetched: number;
  totalListings?: number;
}

export interface ScraperAdapter {
  id: string;
  category: string;
  maxPages: number;
  canHandle(url: URL): boolean;
  scrape(url: URL, options: ScrapeOptions, env: Env): Promise<ScrapeResult>;
}
