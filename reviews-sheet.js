/* Client reviews — live from a Google Sheet.
   ------------------------------------------------------------------
   HOW TO CONNECT (one time, ~3 minutes):
   1. sheets.new — create a blank Google Sheet.
   2. File → Import → Upload → reviews-import.csv (in this deploy folder)
      → "Replace spreadsheet". The sheet now holds all 194 current reviews.
   3. File → Share → Publish to web → pick the sheet tab, choose
      "Comma-separated values (.csv)" → Publish → copy the URL.
   4. Paste that URL between the quotes below and redeploy.

   From then on: edit the sheet, and the site updates on its own
   (Google refreshes the published copy within a few minutes).

   Columns (row 1 must stay as headers, any order):
     Source      Zillow | Google
     Name        reviewer's name as it should display
     Anonymized  "yes" to style the name as anonymous, else blank
     Date        "June 2026" or 6/15/2026 — used for newest-first order
     Stars       1–5
     Category    buyer | seller | both
     Location    optional, e.g. "Maple Ridge"
     Review      the full review text

   If the URL below is still the placeholder, or Google is unreachable,
   the page silently uses the built-in reviews in reviews-data.js —
   the section can never come up empty. */

var REVIEWS_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQi51XCrkoMTkw1AdZPx2yqZKfPmFvLKCecQg3F4_J6tb4P2r5Y8W2qb1L0y8MI1Dg1wQglbSmDtN8U/pub?gid=1575221319&single=true&output=csv";

(function () {
  if (REVIEWS_SHEET_CSV_URL.indexOf("https://") !== 0) return;

  // Last successful sheet load, cached locally: applied synchronously here
  // (this script runs before the page's render script), so repeat visitors
  // see the sheet's numbers on first paint instead of a built-in→sheet flash.
  var CACHE_KEY = "morgan-reviews-cache-v1";
  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && cached.length) window.MORGAN_REVIEWS = cached;
  } catch (e) { /* corrupt or unavailable storage — built-in data stands */ }

  // RFC-4180 CSV parser: handles quoted fields, embedded commas,
  // escaped quotes and newlines inside a review body.
  function parseCSV(text) {
    var rows = [], row = [], field = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQ = false;
        } else field += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += ch;
    }
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    return rows;
  }

  var MONTHS = { january:0, february:1, march:2, april:3, may:4, june:5, july:6,
    august:7, september:8, october:9, november:10, december:11 };

  // "June 2026" → mid-month; "6/15/2026" → exact; anything else → 0 (sorts last).
  function toTs(label) {
    label = String(label || "").trim();
    var m = label.toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
    if (m && MONTHS.hasOwnProperty(m[1])) return new Date(+m[2], MONTHS[m[1]], 15).getTime();
    var d = new Date(label);
    return isNaN(d) ? 0 : d.getTime();
  }

  function toReview(head, cells) {
    var g = function (name) {
      var i = head.indexOf(name);
      return i === -1 ? "" : String(cells[i] || "").trim();
    };
    var stars = Math.max(1, Math.min(5, Math.round(parseFloat(g("stars")) || 5)));
    var cat = g("category").toLowerCase();
    if (cat !== "buyer" && cat !== "seller" && cat !== "both") cat = "both";
    var src = /zillow/i.test(g("source")) ? "Zillow" : "Google";
    return {
      s: src,
      n: g("name"),
      a: /^(yes|y|true|1)$/i.test(g("anonymized")) ? 1 : 0,
      d: g("date"),
      t: toTs(g("date")),
      r: stars,
      c: cat,
      l: g("location"),
      b: g("review")
    };
  }

  fetch(REVIEWS_SHEET_CSV_URL, { cache: "no-store", redirect: "follow" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);
      if (rows.length < 2) throw new Error("sheet has no data rows");
      var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
      if (head.indexOf("review") === -1 || head.indexOf("name") === -1)
        throw new Error("missing Name/Review header row");
      var list = rows.slice(1).map(function (r) { return toReview(head, r); })
        .filter(function (r) { return r.n && r.b; });
      if (!list.length) throw new Error("no usable rows");
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) {}
      window.MORGAN_REVIEWS = list;
      window.dispatchEvent(new CustomEvent("morgan-reviews-updated"));
      console.info("[reviews] loaded " + list.length + " from Google Sheet");
    })
    .catch(function (err) {
      // Built-in reviews-data.js copy stays on screen.
      console.info("[reviews] sheet unavailable (" + err.message + "), using built-in data");
    });
})();
