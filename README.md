# FindMyPropane.com

Static directory site for propane refill & exchange locations in Texas and
New Mexico. The deployable site lives in `propane-directory/`.

## How the site is built

The homepage, both state pages, and all 18 city pages are **generated** by
`build.py`. All 299 listings are rendered directly into the HTML at build time
so search engines (and the AdSense reviewer) see the full content without
JavaScript.

Inputs:

| File | Contents |
|---|---|
| `propane-directory/data/listings.json` | Business listings (name, address, phone, services, rating, lat/lng) |
| `propane-directory/data/cities.json` | Per-city intro text, "about" section HTML, and FAQs |
| `propane-directory/data/states.json` | Per-state "about" section HTML |

To add or update a listing, edit `data/listings.json`, then regenerate:

```bash
python3 build.py
```

This rewrites `index.html`, `texas.html`, `new-mexico.html`, every city page,
and `sitemap.xml` (with fresh `lastmod` dates). Commit the regenerated files
along with the data change.

To add a new city: add its listings to `listings.json`, add an entry to the
`CITIES` list in `build.py`, add editorial content to `data/cities.json`, and
rebuild.

Hand-maintained pages (edit directly, no rebuild needed): `about.html`,
`contact.html`, `privacy.html`, `map.html`, `blog.html`, and everything in
`blog/`. `fix_static_pages.py` was the one-time migration that restyled these
pages; new blog posts should copy the structure of an existing post.

## Advertising / AdSense

The AdSense loader script stays in every page's `<head>` (required for site
review). No manual `<ins>` ad units are placed — once the site is approved,
enable **Auto ads** in the AdSense dashboard, or re-add manual units in
`build.py`'s templates.

`js/main.js` provides client-side search: it filters the statically rendered
cards on city pages and fetches `data/listings.json` for cross-city search on
the homepage and state pages.
