import { bilbasenAdapter } from "./adapters/bilbasen.js";
import { mc123Adapter } from "./adapters/123mc.js";
import { FRONTEND_HTML } from "./frontend.js";
import { json } from "./http.js";
import type { ScraperAdapter } from "./types.js";

const adapters: readonly ScraperAdapter[] = [bilbasenAdapter, mc123Adapter];

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(FRONTEND_HTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (url.pathname === "/health") return json({ ok: true, adapters: adapters.map(({ id, category }) => ({ id, category })) });
    if (url.pathname !== "/api/scrape") return json({ ok: false, error: "Not found" }, 404);

    const target = url.searchParams.get("url");
    if (!target) return json({ ok: false, error: "Missing url" }, 400);

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return json({ ok: false, error: "Invalid URL" }, 400);
    }
    if (targetUrl.protocol !== "https:") return json({ ok: false, error: "Only HTTPS URLs are allowed" }, 400);

    const adapter = adapters.find((candidate) => candidate.canHandle(targetUrl));
    if (!adapter) return json({ ok: false, error: `Unsupported site: ${targetUrl.hostname}` }, 400);

    const requestedPages = Number(url.searchParams.get("maxPages") ?? 10);
    const maxPages = Number.isFinite(requestedPages) ? Math.max(1, Math.floor(requestedPages)) : 10;

    try {
      console.log(JSON.stringify({ event: "scrape_start", source: adapter.id, host: targetUrl.hostname, maxPages }));
      const result = await adapter.scrape(targetUrl, { maxPages }, env);
      console.log(JSON.stringify({ event: "scrape_done", source: adapter.id, pagesFetched: result.pagesFetched, listings: result.listings.length }));
      return json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scrape error";
      console.error(JSON.stringify({ event: "scrape_error", source: adapter.id, message }));
      return json({ ok: false, error: message }, 502);
    }
  }
} satisfies ExportedHandler<Env>;
