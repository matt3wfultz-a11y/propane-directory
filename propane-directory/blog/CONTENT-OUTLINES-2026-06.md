# Blog Content Outlines — GSC Query Gap Review (2026-06-19)

Source: Search Console queries supplied for this run — "propane refill near me" (122
impressions), "propane exchange near me" (18), "propane tanks near me" (10), "propane gas
near me" (9), "propane refill" (7). Top pages: /el-paso.html (396 impr, pos 10.38),
homepage (91 impr, pos 17.59), /texas.html (23 impr, pos 6.96).

## Coverage check (do this before writing anything new)

Most of these queries already have dedicated, full posts from a prior pass
(`1ee60ae Add 3 El Paso-focused blog posts targeting top search queries`):

| Query | Status | Existing page |
|---|---|---|
| propane refill near me | ✅ covered | `blog/propane-refill-near-me-el-paso.html` |
| propane exchange near me | ✅ covered | `blog/propane-exchange-near-me-el-paso.html` |
| propane refill | ✅ covered | `blog/propane-refill-near-me-el-paso.html`, `blog/cheapest-propane-near-me.html` |
| propane gas near me | ~partial | `blog/propane-near-me-el-paso.html` (title says "Gas, Tanks & Refill Stations" but isn't an exact-match landing page) |
| propane tanks near me | ❌ gap | no dedicated page |

This site has twice been flagged for low-value/duplicate content
(`a975da6`, `11c636b`) and had to rewrite city pages and strip boilerplate
FAQs/fake schema. The three existing "near me + El Paso" posts are already
close in topic to each other. **Adding more near-duplicate "near me" pages
is the wrong move here** — it risks another thin-content flag and could
cannibalize the post that's already ranking. Outline below targets only the
real gap, and a higher-leverage non-content fix is called out separately.

## New post outline: "Propane Tanks Near Me in El Paso, TX"

Slug: `blog/propane-tanks-near-me-el-paso.html`
Target query: propane tanks near me (+ secondary: propane tank exchange/refill El Paso)

Differentiator from the existing 3 posts: those answer "where do I refill /
exchange," this one answers "where do I get a tank" — i.e., someone who
doesn't own a cylinder yet (new grill, new RV, first-time generator buyer)
and needs to compare buying new vs. exchanging vs. having one filled.

1. **H1**: Propane Tanks Near Me in El Paso, TX — Buy, Exchange, or Fill
2. **Intro** (2-3 sentences): who's searching this (no tank yet, or current
   tank failed inspection) and what they'll get from the page.
3. **Three ways to get a tank in El Paso** (the core differentiator):
   - Buy new (hardware stores, Tractor Supply, Walmart) — price range, what
     size to buy first-time (20 lb std for grills)
   - Exchange (Blue Rhino/AmeriGas cages) — link to the existing exchange post
     for price detail, don't repeat it here
   - Get an old tank refilled instead of buying — link to the refill post
4. **Pricing comparison table**: new tank purchase vs exchange vs refill,
   $ per tank, $ effective per gallon, upfront cost vs ongoing cost
5. **Which option makes sense** — decision guidance by use case (grill
   owner, RV owner, first-time buyer, tank failed 12-yr recertification —
   link to recertification post)
6. **Where in El Paso** — 3-4 named locations/areas, tie back to directory
   listings on `el-paso.html`
7. **CTA**: "See all 11 propane locations in El Paso" → link to
   `/el-paso.html`
8. **FAQ** (2-3 real questions, no boilerplate): "Can I exchange a tank I
   bought somewhere else?", "Do new tanks come full?", "What size tank do
   most grills use?" (link `what-size-propane-tank-do-i-need.html` for the
   full breakdown instead of re-answering it)

Schema: reuse the FAQPage pattern from `cheapest-propane-near-me.html`.

## Higher-leverage move: el-paso.html itself

El Paso is the top page by far (396 impressions, 4x the homepage) and is
already on page 2 at position 10.38 — closer to page 1 than any other page
tracked. Before writing more new posts, it's worth an on-page pass on
`el-paso.html` itself (title/H1/intro copy, internal links from the new
blog posts into it, fresh review/last-updated date) since a small ranking
gain there is worth more than another new thin page given the site's
content-quality history.

## Not recommended right now

- A dedicated "propane gas near me" page — overlaps too much with
  `propane-near-me-el-paso.html`; consider only if that existing page's
  rankings stall after the el-paso.html pass above.
