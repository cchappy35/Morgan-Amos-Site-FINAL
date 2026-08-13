/* =========================================================
   Morgan Amos Realtor — live feeds

   Four Coldwell Banker Kennon & Parker feeds, fetched DIRECTLY in the browser:

     active   https://kpdd.com/agents/morganamos/active.rss
     pending  https://kpdd.com/agents/morganamos/pending.rss
     closed   https://kpdd.com/agents/morganamos/closed.rss
     reviews  https://kpdd.com/agents/morganamos/reviews.rss

   Coldwell Banker Kennon & Parker added Access-Control-Allow-Origin to these routes
   (verified 2026-07-30, all four 200 with valid RSS), so there is no
   proxy, no CORS relay, no rss2json, and no serverless function in
   the path any more. Plain fetch, DOMParser, done.

   Item shapes:
     active / pending / closed  — identical
       <title>     "123 Example St, Columbus, GA 31906 — $389,900"
                   price via /\$[\d,]+/; address is everything
                   before the em dash
       <link>      listing detail page
       <pubDate>   RFC-822
       <enclosure url="…">  photo — OPTIONAL (a closed sale has none)
     reviews
       <title>       "★★★★★ review from Jennifer Gurrola"  (count ★)
       <dc:creator>  reviewer name — namespaced, so read it with
                     getElementsByTagName; querySelector('dc\:creator')
                     does not match in XML mode
       <description> full review text, with real newlines
   ========================================================= */
(function () {
  "use strict";

  const BASE = "https://kpdd.com/agents/morganamos/";
  const NAMES = ["active", "pending", "closed", "reviews"];

  // Each feed is tried same-origin first (functions/feed/[name].js proxies
  // kpdd.com server-side, so CORS never applies), then direct as a fallback
  // for any host without Pages Functions.
  const FEEDS = {};
  NAMES.forEach(function (n) { FEEDS[n] = ["/feed/" + n, BASE + n + ".rss"]; });

  const TIMEOUT_MS = 15000;
  const REFRESH_MS = 5 * 60 * 1000;

  /* ---------- helpers ---------- */

  // Descriptions carry real newlines and HTML entities.
  function clean(text) {
    if (!text) return "";
    const d = document.createElement("div");
    d.innerHTML = String(text).replace(/<br\s*\/?>/gi, " ");
    return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
  }

  function parseDate(raw) {
    if (!raw) return null;
    // RFC-822 parses natively; a space-separated form needs a T for Safari.
    let d = new Date(String(raw).trim());
    if (isNaN(d.getTime())) d = new Date(String(raw).trim().replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  }

  function dateLabel(d) {
    if (!d) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // First matching child element's text — namespace-safe.
  function tagText(item) {
    for (let i = 1; i < arguments.length; i++) {
      const el = item.getElementsByTagName(arguments[i])[0];
      if (el && (el.textContent || "").trim()) return el.textContent.trim();
    }
    return "";
  }

  /* ---------- item shapes ---------- */

  function parseListing(item, status) {
    const rawTitle = tagText(item, "title");
    const price = (rawTitle.match(/\$[\d,]+/) || [""])[0];

    // Address is everything before the em-dash price separator.
    let addressFull = rawTitle.split(/\s*[\u2014\u2013]\s*/)[0].trim() || rawTitle.trim();
    const parts = addressFull.split(",");
    const street = (parts.shift() || addressFull).trim();

    let link = tagText(item, "link");
    if (!link) {
      const l = item.querySelector("link");
      link = l ? (l.getAttribute("href") || "").trim() : "";
    }

    // <enclosure> is optional. Empty string means "no photo" — the
    // renderers paint a placeholder rather than requesting anything.
    const enc = item.getElementsByTagName("enclosure")[0];
    const img = enc ? (enc.getAttribute("url") || "").trim() : "";

    const listedAt = parseDate(tagText(item, "pubDate"));

    return {
      address: street || "View listing",
      area: parts.join(",").trim(),
      price: price,
      desc: clean(tagText(item, "description", "summary", "content")),
      href: link || BASE,
      imgSrc: /^https?:\/\//i.test(img) ? img : "",
      listedAt: listedAt,
      listedLabel: dateLabel(listedAt),
      status: status,
    };
  }

  // Some reviews are attributed to a machine-generated portal handle
  // ("zuser20151103075051434") rather than a person. That reads as a
  // database leak on a client-facing site, so it counts as no name.
  function isHandle(name) {
    if (!name) return true;
    const n = name.trim();
    if (/^zuser\d+$/i.test(n)) return true;
    return !/\s/.test(n) && (n.match(/\d/g) || []).length >= 8;
  }

  function parseReview(item) {
    const title = tagText(item, "title");
    const stars = (title.match(/\u2605/g) || []).length || 5;
    const candidates = [
      tagText(item, "dc:creator", "creator", "author"),
      (title.match(/review from\s+(.+)$/i) || [])[1],
    ];
    const who = candidates.find(function (c) { return c && !isHandle(c); });
    return {
      body: clean(tagText(item, "description", "summary", "content")),
      who: (who || "Verified client").trim(),
      stars: Math.max(1, Math.min(5, stars)),
      at: parseDate(tagText(item, "pubDate")),
    };
  }

  /* ---------- fetching ---------- */

  async function fetchOnce(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      // Cache-buster so a refresh is never served a stale copy.
      const res = await fetch(url + "?_t=" + Date.now(), {
        cache: "no-store",
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const xml = new DOMParser().parseFromString(await res.text(), "application/xml");
      if (xml.querySelector("parsererror")) throw new Error("not valid XML");
      return Array.prototype.slice.call(xml.querySelectorAll("item, entry"));
    } finally {
      clearTimeout(timer);
    }
  }

  // Resolves [] for a genuinely empty feed (pending may be empty right now —
  // that's real feed state, not an error). Tries the same-origin proxy, then
  // the direct URL; only rejects when every route fails.
  async function fetchFeed(name) {
    const urls = FEEDS[name];
    if (!urls) throw new Error("unknown feed " + name);

    let lastErr;
    for (let i = 0; i < urls.length; i++) {
      try {
        return await fetchOnce(urls[i]);
      } catch (err) {
        lastErr = err;
        console.info("[feed:" + name + "] " + urls[i] + " \u2192 " + err.message);
      }
    }
    throw lastErr || new Error("no route to feed " + name);
  }

  // Actives + pendings + closed, each tagged with the feed it came
  // from. A feed that can't be read is skipped rather than failing the
  // whole set; only a total blackout rejects.
  async function fetchListings() {
    const wanted = [
      { name: "active", status: "active" },
      { name: "pending", status: "pending" },
      { name: "closed", status: "sold" },
    ];
    const results = await Promise.allSettled(wanted.map((w) => fetchFeed(w.name)));

    const out = [];
    let anyOk = false;
    results.forEach(function (r, i) {
      if (r.status !== "fulfilled") {
        console.info("[feed:" + wanted[i].name + "] " + (r.reason && r.reason.message));
        return;
      }
      anyOk = true;
      console.info("[feed:" + wanted[i].name + "] " + r.value.length + " item(s)");
      r.value.forEach(function (item) { out.push(parseListing(item, wanted[i].status)); });
    });

    if (!anyOk) throw new Error("no listing feed could be read");
    return out;
  }

  async function fetchReviews() {
    const items = await fetchFeed("reviews");
    return items.map(parseReview).filter(function (r) { return r.body; });
  }

  /* ---------- page controller ----------
     Initial load, 5-minute auto-refresh, manual refresh, and the
     "updated X min ago" label.

     render() runs ONLY when the data actually changes — re-rendering
     mid-load cancels in-flight photo requests, so a refresh that
     returns the same items leaves the DOM and its images alone. */
  function mount(opts) {
    const load = opts.load || fetchListings;
    const sign = opts.sign || function (items) {
      return items.map(function (l) {
        return [l.href, l.address || l.body, l.price, l.status, l.imgSrc].join("|");
      }).join("~");
    };

    let signature = null;
    let lastLoad = null;
    let busy = false;

    function ago() {
      if (!lastLoad) return "";
      const mins = Math.floor((Date.now() - lastLoad) / 60000);
      if (mins < 1) return "Updated just now";
      if (mins === 1) return "Updated 1 min ago";
      return "Updated " + mins + " min ago";
    }

    function status(text) {
      if (opts.onStatus) opts.onStatus(text);
    }

    async function refresh() {
      if (busy) return;
      busy = true;
      status(signature === null ? "Loading\u2026" : "Checking for updates\u2026");
      try {
        const items = await load();
        lastLoad = Date.now();
        const sig = sign(items);
        if (sig !== signature) {
          signature = sig;
          opts.render(items);
        }
        status(ago());
      } catch (e) {
        if (signature === null && opts.onError) opts.onError(e);
        else status("Couldn't refresh \u2014 showing the last update");
      } finally {
        busy = false;
      }
    }

    if (opts.onLoading) opts.onLoading();
    refresh();
    setInterval(refresh, REFRESH_MS);
    setInterval(function () { if (!busy) status(ago()); }, 60000);

    return { refresh: refresh };
  }

  window.MorganFeeds = {
    FEEDS, fetchFeed, fetchListings, fetchReviews, mount,
    parseListing, parseReview, dateLabel, clean,
  };
})();
