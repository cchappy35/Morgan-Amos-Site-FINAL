# Morgan Amos Realtor — Cloudflare Pages deploy

Static site. No build step, no dependencies, no server code. Six HTML pages,
two stylesheets, one feed script, one review data file. Pages publishes this
folder as-is.

## Deploy

**Direct upload** — Cloudflare dashboard → Workers & Pages → Create → Pages →
Upload assets. Drag this whole folder in.

**Wrangler**

```bash
cd cloudflare-deploy
npx wrangler pages deploy .
```

**Git** — commit this folder as the repo root and connect it in Pages with:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | *(empty)* |
| Build output directory | `/` |

Pages reads `_headers` and `_redirects` natively — same format Netlify uses,
so both exports share those two files verbatim.

## What's in here

```
index.html          Home
meet-morgan.html    Meet Morgan
buy.html            Buying a home
sell.html           Selling a home
listings.html       Active listings
reviews.html        All 194 client reviews

shared.css          Base styles — UNCHANGED from the original site
mobile.css          Responsive overrides: the mobile layout
                    (max-width: 767px) + desktop vertical rhythm
                    (min-width: 768px). Nothing else touches desktop.
fonts.css           @font-face declarations
feeds.js            Pulls the live Coldwell Banker Kennon & Parker listing feed
reviews-data.js     The 194 client reviews, static — no network call

fonts/              Self-hosted Cormorant Garamond, Inter, Italiana
uploads/            Photography and logos

_headers            Cache + security headers
_redirects          Pretty URLs (/buy, /sell, /listings, /reviews…)
```

## Desktop / mobile configuration

Each page loads two stylesheets, in this order:

```html
<link rel="stylesheet" href="shared.css" />
...page's inline <style> block...
<link rel="stylesheet" href="mobile.css" />
```

All three stylesheet paths are **relative** (no leading slash) so the folder
works in preview, on a Pages root deploy, and inside a subdirectory alike.

`mobile.css` **must stay last** — it wins on equal specificity, which is how
the mobile layout overrides the desktop rules without `!important`.

`mobile.css` holds two independent media blocks:

- **`@media (max-width: 767px)`** — the optimized mobile layout.
- **`@media (min-width: 768px)`** — desktop vertical rhythm only. Section
  padding was up to ~130px per block, so a boundary stacked ~300px of empty
  space; these pull the bands in by about a third. Padding and margin only —
  no colours, type, or structure change. The listings section and the finale
  share the same `--cream-light` background, so that seam is collapsed to a
  single band instead of two stacked ones.

To roll either back, delete the corresponding media block, or drop the one
`<link>` line from the six pages to revert everything. Nothing else
references it.

## What mobile.css changes — mobile (≤767px)

| # | Section | Mobile behavior |
|---|---------|-----------------|
| 1 | Masthead | One 68px sticky row: hamburger left, Morgan + Coldwell Banker centered at equal 26px height, 44px call button right. Drawer rows 52px. |
| 2 | Hero | 400px portrait band with no text over it, then headline, tagline and proof line on flat navy — crisp type, face unobstructed. Intro copy and CTA on cream in the thumb zone. |
| 3 | Stats | Four stats as one bar with hairline dividers. |
| 4 | Sections | 24px gutters, 48px vertical rhythm, headings scaled to fit 320px. |
| 5 | Reviews | Homepage wall becomes a horizontal swipe carousel, 290px cards, snap points. |
| 6 | Services | Sell then Buy, stacked full-bleed. |
| 7 | Listings | Swipe carousel, 270px cards; "View all listings" a full-width navy pill above the source line. |
| 8 | Finale | Phone number becomes a 56px button. |
| 9 | Footer | Single column, 46px tappable rows. |
| 10 | Forms | 52px fields at 16px so iOS doesn't zoom on focus. |
| 11 | Reviews page | Filter chip rows scroll sideways instead of stacking the sticky bar; cards go single-column. |

Brokerage compliance: the Coldwell Banker mark stays in the header at equal
height to Morgan's logo at every breakpoint.

The sticky Call/Text bar (`.callbar`) is untouched — `shared.css` already
shows it at ≤720px.

## What mobile.css changes — desktop (≥768px)

Vertical rhythm only:

| Selector | Was | Now |
|---|---|---|
| `.section` | clamp(56px, 9vw, 140px) | clamp(52px, 6vw, 92px) |
| `.finale` | clamp(72px, 12vw, 180px) | clamp(60px, 7vw, 104px) |
| `.pullquote` | clamp(64px, 10vw, 160px) | clamp(60px, 7vw, 108px) |
| `.service` | clamp(52px, 7vw, 110px) | clamp(48px, 5.5vw, 88px) |
| `.marquee` | clamp(40px, 5vw, 64px) | clamp(36px, 4vw, 56px) |
| `.footer` | clamp(56px, 8vw, 110px) | clamp(52px, 6vw, 88px) |
| `.hero` bottom | clamp(48px, 7vw, 100px) | clamp(44px, 5vw, 76px) |
| `.listings__foot` margin-top | clamp(40px, 5vw, 64px) | clamp(32px, 3.5vw, 44px) |
| `.section--cream-light + .finale` | full top padding | clamp(8px, 1vw, 18px) |

Measured at 1440px, the listings-to-CTA seam went from roughly 300px of dead
space to about 105px.

## Live listings

`feeds.js` fetches from kpdd.com at runtime. If the feed is unreachable the
section falls back to its offline message; no build-time data is baked in.

## Reviews

`reviews.html` renders from `reviews-data.js` — 194 reviews scraped from
Morgan's Zillow profile and Google Business Profile, held statically. There is
no review feed and no network call, so this page cannot fail on CORS.

Regenerate `reviews-data.js` from the source spreadsheet rather than
hand-editing the array. Two notes on the data:

- Google rows have no transaction column in the sheet, so each one's
  buyer/seller category was set by reading the review body.
- Google supplies only relative dates ("a year ago"), resolved to mid-month.
  Ordering is newest-first and a Google entry can sit a couple of weeks off
  from its true position among the exactly-dated Zillow ones.

One 1-star review from November 2016 is present in the source sheet and
deliberately excluded from `reviews-data.js`. Zillow usernames
(`zuser2015…`) render as "Verified Zillow client" rather than the raw handle.

## Brokerage identity — compliance record

Brokerage renamed from **Coldwell Banker Kennon, Parker, Duncan & Davis** to
**Coldwell Banker Kennon & Parker**. The abbreviation "KPDD" is written out in
full everywhere and must never be reintroduced.

### Logo assets

| File | Provenance | Used by |
|------|-----------|---------|
| `uploads/coldwell-banker-kennon-parker-white.png` | **Brokerage-supplied, unaltered.** Reversed (white) lockup. | Footer brokerage lockup, all pages |
| `uploads/coldwell-banker-kennon-parker.png` | **DERIVED — not official artwork.** | Header masthead, all pages |

> **Action required.** The header file is a navy colorway generated from the
> supplied reversed lockup by recoloring every opaque pixel to CB navy
> `rgb(1,33,105)`. Letterforms and proportions are preserved exactly, but
> because it descends from the reversed art it has no solid navy containment
> box or inner keyline — it is a one-color reverse of a reverse.
>
> Request the official **positive/navy** Kennon & Parker lockup from Coldwell
> Banker marketing and overwrite `uploads/coldwell-banker-kennon-parker.png`
> with it. No markup or CSS changes are needed; every reference already points
> at that path.

The retired `coldwell-banker-kpdd.webp` (old Duncan & Davis mark) has been
deleted from both `uploads/` folders so it cannot be served.

`morgan.amos@kpdd.com`, the `kpdd.com` RSS endpoints, and the masthead
`https://kpdd.com` link are functional, not advertising, and are left as-is.

### Known gaps — now closed

Descriptions, Open Graph / Twitter cards and the share image were added in the
launch pass below. Favicon / apple-touch-icon remain Morgan's own ornament,
not a brokerage mark.

## Launch pass — forms, SEO, social sharing

### Lead forms → email

The buyer form (`buy.html`) and seller form (`sell.html`) POST to
[Web3Forms](https://web3forms.com), a free hosted form-to-email relay. Static
hosting stays static — no Pages Function, no API secret in the repo.

**One step before launch:** request an access key at web3forms.com using
`morgan.amos@kpdd.com`, then paste it into the top of `forms.js`:

```js
var WEB3FORMS_ACCESS_KEY = "PASTE-YOUR-WEB3FORMS-ACCESS-KEY-HERE";
```

Until that key is in place — and any time the network call fails — `forms.js`
falls back to opening the visitor's mail app with every field pre-filled and
addressed to `morgan.amos@kpdd.com`, so a lead is never silently dropped.

`forms.js` handles any `<form data-lead-form>`: it submits by fetch, swaps the
button to a thank-you, writes a status line into `.form-note`, includes a
hidden `botcheck` honeypot, and sets a per-form `subject` so buyer and seller
inquiries are distinguishable in the inbox. Both forms' fields now carry
`name` attributes — that is what makes the email readable.

### SEO

Per page: a written `<meta name="description">`, a `<link rel="canonical">` on
`https://morganamosrealtor.com`, `robots` with `max-image-preview:large`, and
geo hints for Columbus, GA. Titles were rewritten to lead with the search
phrase and keep the brand second, e.g. *Sell Your Home in Columbus, GA ·
Morgan Amos, Realtor®*.

`index.html` also carries `RealEstateAgent` JSON-LD: name, phone, email,
brokerage as `parentOrganization`, office address, the five cities served, and
`sameAs` for Instagram, Facebook, Zillow and the Google Business Profile. No
`aggregateRating` is declared — the review count is public on Zillow and Google
and does not need restating in schema, where an inexact figure is a liability.

### Social share preview

`og-share.png` — 1200×630, generated from `uploads/morgan-logo.png` on the
site's own cream with a hairline rule, "Columbus, Georgia" and the brokerage
name. Every page points Open Graph and Twitter (`summary_large_image`) at it,
so a link shared to Facebook, Instagram DMs, iMessage or LinkedIn previews
with Morgan's mark and brokerage attribution.

Profile links (Instagram, Facebook, Google, Zillow) were already live in the
hero, finale and footer of every page and were left untouched.

### New files

```
forms.js        Lead-form submit handler + mailto fallback
og-share.png    1200×630 social share image
robots.txt      Allow-all + sitemap pointer
sitemap.xml     Six URLs, listings marked daily
```


## Launch pass 2 — 404, analytics, verification, headers

### `404.html`

Cloudflare Pages serves this automatically for any unmatched path. It is
deliberately **self-contained** — its own `@font-face` rules, tokens and
styles inline, and every asset path root-absolute (`/uploads/…`, `/fonts/…`)
— because a 404 can be served from any depth, where relative paths break.
`noindex, follow` so it never enters the index but still passes link equity.

### Google Analytics 4

The gtag snippet sits at the end of `<head>` on all six pages and on
`404.html`. **Replace both occurrences of `G-XXXXXXXXXX` per file** with the
real Measurement ID once the property exists.

`forms.js` fires a `generate_lead` event on a successful submit, tagged
`seller_inquiry` or `buyer_inquiry`, so the two forms are separable in GA. The
call is guarded by `typeof gtag === "function"` — nothing breaks if analytics
is blocked or the ID is still a placeholder.

### Google Search Console

`index.html` carries a `google-site-verification` meta with an `XXX…` token.
Replace it with the string from Search Console → Settings → Ownership
verification → HTML tag. Alternatively, verifying at the **Domain** level over
DNS covers every host at once and needs no tag — if you go that route, delete
the meta line. After verification, submit `https://morganamosrealtor.com/sitemap.xml`.

### Security headers

`_headers` now also sends HSTS (one year, subdomains, **no** `preload` — add
that only when every subdomain is HTTPS for good), a restrictive
`Permissions-Policy`, `Cross-Origin-Opener-Policy`, and a Content Security
Policy.

The CSP is commented inline. Two things to know before editing it:

- `script-src` includes `'unsafe-inline'` because the pages carry inline
  scripts (nav toggle, listing renderer, year stamp). Removing it means
  extracting those into files or adding per-tag nonces, which Pages cannot
  generate on a static deploy.
- `img-src` is `https:` rather than a host list, because listing photos come
  from whatever CDN the brokerage RSS `<enclosure>` points at.

If a new third-party embed is ever added — a RealScout widget, a video, a
chat tool — it will be blocked until its host is added to the right directive.
That is the policy working, not a bug.
