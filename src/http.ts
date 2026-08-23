const DEFAULT_MAX_BYTES = 3_000_000;

export async function readTextLimited(response: Response, maxBytes = DEFAULT_MAX_BYTES): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error(`Response exceeded ${maxBytes} bytes`);
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export function cleanText(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&aelig;/g, "æ")
    .replace(/&oslash;/g, "ø")
    .replace(/&aring;/g, "å")
    .replace(/&AElig;/g, "Æ")
    .replace(/&Oslash;/g, "Ø")
    .replace(/&Aring;/g, "Å")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

export function parseDanishNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[^0-9-]/g, "");
  if (!digits) return undefined;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : undefined;
}
