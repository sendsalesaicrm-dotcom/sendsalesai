import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_REDIRECTS = 3;

const isAllowedHost = (host: string): boolean => {
  const h = (host || "").toLowerCase();
  // WhatsApp CDN and related hosts. Keep this narrow to avoid SSRF/open proxy.
  if (h === "pps.whatsapp.net") return true;
  if (h === "mmg.whatsapp.net") return true;
  if (h.endsWith(".whatsapp.net")) return true;
  // Meta/FB media hosts sometimes appear (esp. Meta Cloud API)
  if (h === "lookaside.fbsbx.com") return true;
  if (h.endsWith(".fbcdn.net")) return true;
  return false;
};

const parseAndValidate = (rawUrl: string | null): URL => {
  if (!rawUrl) throw new Error("Missing url param");
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error("Missing url param");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "https:") throw new Error("Only https URLs are allowed");
  if (!isAllowedHost(parsed.hostname)) throw new Error("Host not allowed");

  return parsed;
};

const fetchWithRedirects = async (startUrl: URL): Promise<Response> => {
  let current = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(current.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        // Some CDNs are picky about UA/accept.
        "User-Agent": "Mozilla/5.0 (compatible; SendSalesAI/1.0)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;

      const next = new URL(location, current);
      if (next.protocol !== "https:") throw new Error("Redirected to non-https URL");
      if (!isAllowedHost(next.hostname)) throw new Error("Redirected to disallowed host");
      current = next;
      continue;
    }

    return res;
  }

  throw new Error("Too many redirects");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const u = new URL(req.url);
    const urlParam = u.searchParams.get("url");
    const target = parseAndValidate(urlParam);

    const upstream = await fetchWithRedirects(target);
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: "Upstream fetch failed",
          status: upstream.status,
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      const n = Number(contentLength);
      if (Number.isFinite(n) && n > MAX_BYTES) {
        return new Response("Payload too large", { status: 413, headers: corsHeaders });
      }
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const cacheControl = "public, max-age=86400";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || String(err) }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
