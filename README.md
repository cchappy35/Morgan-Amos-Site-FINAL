# Morgan Amos Realtor — website

Static site. No build step, no dependencies, no server code. Five
HTML pages, one stylesheet, one feed script, self-hosted fonts, and
the photos.

```
index.html          Home
listings.html       Listings (live feed)
buy.html            For buyers
sell.html           For sellers
meet-morgan.html    About Morgan
shared.css          All shared styling
fonts.css           @font-face for the self-hosted fonts
feeds.js            Reads the KPDD RSS feeds
fonts/              Cormorant Garamond, Inter, Italiana (woff2)
uploads/            Photography and logos
_headers            Cloudflare Pages caching + security headers
```

## Publish on Cloudflare Pages

1. Push this folder to a GitHub repo (see below).
2. Cloudflare dashboard → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**, and pick the repo.
3. Build settings — leave these **empty**, this is not a build:
   - Framework preset: **None**
   - Build command: *(blank)*
   - Build output directory: `/`
4. **Save and Deploy.** It publishes in under a minute at
   `your-project.pages.dev`.

Every `git push` to the main branch redeploys automatically.

### Custom domain

Pages project → **Custom domains** → **Set up a domain** → enter the
domain. If the domain is already on Cloudflare, the DNS record is
created for you; otherwise follow the CNAME it shows you.

## Pushing to GitHub

```bash
cd cloudflare-deploy
git init
git add .
git commit -m "Morgan Amos Realtor website"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Or, with no terminal: create the repo on github.com, click
**uploading an existing file**, and drag everything in this folder in.
Include the `fonts/` and `uploads/` folders, and the dot-file
`_headers`.

## The live listings

The site reads four KPDD feeds directly in the browser:

| Feed | Where it appears |
|---|---|
| `active.rss` | Listings grid, home page "Currently on the market" |
| `pending.rss` | Listings grid, Pending tab |
| `closed.rss` | "Recently sold" strip (hidden when empty) |
| `reviews.rss` | Home page testimonials |

`https://kpdd.com/agents/morganamos/{feed}.rss`

KPDD sends `Access-Control-Allow-Origin` on these routes, so there
is no proxy, relay, or serverless function involved — `feeds.js`
does a plain `fetch()`. Nothing is hard-coded or cached: each visit
reads the feeds live and re-checks every five minutes, with a Refresh
button and an "updated X min ago" note.

Listing titles arrive as `123 Example St, Columbus, GA 31906 —
$389,900`; the price is split out of the title. Photos come from
`<enclosure>`, which is optional — listings without one show a
striped placeholder. Empty feeds are a normal state, not an error:
the Pending tab reads "Nothing under contract right now."

If listings ever stop appearing, open the browser console. A
`Failed to fetch` there means KPDD dropped the CORS header again —
that is fixed on their end, not in this code.

## Editing content

Page copy lives as plain text in the HTML files. Colors, type, and
spacing are CSS variables at the top of `shared.css`. Replacing a
photo means dropping a file into `uploads/` with the same name.

Contact details (phone `(706) 888-1865`, license numbers) appear in
each page's header, footer, and call bar — search across files when
changing them.
