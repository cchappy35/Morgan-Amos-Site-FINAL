/* Cloudflare Pages Function — same-origin proxy for the brokerage RSS feeds.
   ---------------------------------------------------------------------------
   Why this exists: the listing feeds live on kpdd.com, so the browser reading
   them directly depends on the brokerage continuing to send
   Access-Control-Allow-Origin for THIS site's origin. That is outside our
   control and silently breaks the listings section when it changes.

   Fetching server-side removes the dependency entirely: the browser only ever
   talks to our own origin (/feed/active, /feed/pending, /feed/closed,
   /feed/reviews) and CORS never enters the picture.

   No build step, no dependencies, no secrets. Pages picks up the functions/
   directory automatically on deploy.

   feeds.js tries this proxy first and falls back to the direct kpdd.com URL,
   so the site still works if it is ever hosted somewhere without Functions. */

const BASE = "https://kpdd.com/agents/morganamos/";
const ALLOWED = ["active", "pending", "closed", "reviews"];

export async function onRequestGet(context) {
  const name = String(context.params.name || "").toLowerCase().replace(/\.rss$/, "");

  if (ALLOWED.indexOf(name) === -1) {
    return new Response("Unknown feed.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let upstream;
  try {
    upstream = await fetch(BASE + name + ".rss", {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
        "User-Agent": "morganamosrealtor.com listing feed reader",
      },
      // Two minutes at the edge: fresh enough for a new listing, and it keeps
      // a page refresh from hammering the brokerage server.
      cf: { cacheTtl: 120, cacheEverything: true },
    });
  } catch (err) {
    return fail(502, "Upstream unreachable.");
  }

  if (!upstream.ok) return fail(502, "Upstream responded " + upstream.status + ".");

  const xml = await upstream.text();
  if (!/<(rss|feed)[\s>]/i.test(xml)) return fail(502, "Upstream did not return RSS.");

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=120",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function fail(status, message) {
  return new Response(message + "\n", {
    status: status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
