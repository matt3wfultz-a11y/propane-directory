#!/usr/bin/env python3
"""Add JSON-LD schema markup to pages that are missing it."""
import json, re
from pathlib import Path

BASE = Path("propane-directory")
DATA = BASE / "data" / "listings.json"
listings = json.loads(DATA.read_text())

def inject_schema(fpath, schema_obj):
    html = fpath.read_text()
    # Skip if already has ld+json
    if 'application/ld+json' in html:
        print(f"SKIP (has schema): {fpath.name}")
        return
    schema_json = json.dumps(schema_obj, indent=2, ensure_ascii=False)
    script = f'    <script type="application/ld+json">\n{schema_json}\n    </script>'
    html = html.replace("</head>", f"{script}\n</head>", 1)
    fpath.write_text(html)
    print(f"UPDATED: {fpath.name}")

def build_city_schema(city, state, city_listings, url):
    items = []
    for i, loc in enumerate(city_listings, 1):
        item = {
            "@type": "ListItem",
            "position": i,
            "item": {
                "@type": "LocalBusiness",
                "name": loc["name"],
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": loc["address"],
                    "addressLocality": city,
                    "addressRegion": state,
                    "addressCountry": "US"
                }
            }
        }
        if loc.get("phone"):
            item["item"]["telephone"] = loc["phone"]
        if loc.get("rating") and loc.get("reviewCount", 0) >= 3:
            item["item"]["aggregateRating"] = {
                "@type": "AggregateRating",
                "ratingValue": loc["rating"],
                "reviewCount": loc["reviewCount"]
            }
        if loc.get("lat") and loc.get("lng"):
            item["item"]["geo"] = {
                "@type": "GeoCoordinates",
                "latitude": loc["lat"],
                "longitude": loc["lng"]
            }
        items.append(item)

    label = city if state == "TX" else f"{city}, {state}"
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": f"{city} Propane Suppliers",
        "description": f"Propane refill and exchange locations in {city}, {state}",
        "url": url,
        "numberOfItems": len(items),
        "itemListElement": items
    }

# ── City pages ────────────────────────────────────────────────────────────────
city_pages = [
    ("Dallas",       "TX", "dallas.html"),
    ("Horizon City", "TX", "horizon-city.html"),
    ("Socorro",      "TX", "socorro-tx.html"),
    ("Canutillo",    "TX", "canutillo-tx.html"),
    ("Fabens",       "TX", "fabens-tx.html"),
    ("Anthony",      "TX", "anthony-tx.html"),
    ("Alamogordo",   "NM", "alamogordo.html"),
    ("Deming",       "NM", "deming.html"),
]

for city, state, fname in city_pages:
    fpath = BASE / fname
    if not fpath.exists():
        print(f"SKIP (no file): {fname}")
        continue
    city_listings = [l for l in listings if l.get("city") == city]
    if not city_listings:
        print(f"SKIP (no data): {city}")
        continue
    slug = fname.replace(".html", "")
    url = f"https://findmypropane.com/{slug}.html"
    schema = build_city_schema(city, state, city_listings, url)
    inject_schema(fpath, schema)

# ── index.html ────────────────────────────────────────────────────────────────
inject_schema(BASE / "index.html", [
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "FindMyPropane.com",
        "url": "https://findmypropane.com/",
        "description": "Propane refill and exchange directory for Texas and New Mexico",
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://findmypropane.com/index.html?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
        }
    },
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "FindMyPropane.com",
        "url": "https://findmypropane.com/",
        "logo": "https://findmypropane.com/images/logo.png",
        "sameAs": [],
        "description": "Independent propane refill and exchange directory covering Texas and New Mexico"
    }
])

# ── texas.html ────────────────────────────────────────────────────────────────
tx_count = sum(1 for l in listings if l.get("state") == "TX")
inject_schema(BASE / "texas.html", {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Texas Propane Suppliers",
    "description": f"Browse {tx_count} propane refill and exchange locations across Texas",
    "url": "https://findmypropane.com/texas.html",
    "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://findmypropane.com/"},
            {"@type": "ListItem", "position": 2, "name": "Texas", "item": "https://findmypropane.com/texas.html"}
        ]
    }
})

# ── new-mexico.html ───────────────────────────────────────────────────────────
nm_count = sum(1 for l in listings if l.get("state") == "NM")
inject_schema(BASE / "new-mexico.html", {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "New Mexico Propane Suppliers",
    "description": f"Browse {nm_count} propane refill and exchange locations across New Mexico",
    "url": "https://findmypropane.com/new-mexico.html",
    "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://findmypropane.com/"},
            {"@type": "ListItem", "position": 2, "name": "New Mexico", "item": "https://findmypropane.com/new-mexico.html"}
        ]
    }
})

# ── about.html ────────────────────────────────────────────────────────────────
inject_schema(BASE / "about.html", {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "FindMyPropane.com",
    "url": "https://findmypropane.com/",
    "logo": "https://findmypropane.com/images/logo.png",
    "description": "FindMyPropane.com is an independent propane refill and exchange directory covering Texas and New Mexico.",
    "areaServed": [
        {"@type": "State", "name": "Texas"},
        {"@type": "State", "name": "New Mexico"}
    ]
})

# ── contact.html ──────────────────────────────────────────────────────────────
inject_schema(BASE / "contact.html", {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact FindMyPropane.com",
    "url": "https://findmypropane.com/contact.html",
    "description": "Contact the FindMyPropane.com team to submit corrections, suggest a location, or ask a question.",
    "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://findmypropane.com/"},
            {"@type": "ListItem", "position": 2, "name": "Contact", "item": "https://findmypropane.com/contact.html"}
        ]
    }
})

# ── blog.html ─────────────────────────────────────────────────────────────────
inject_schema(BASE / "blog.html", {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "FindMyPropane.com Blog",
    "url": "https://findmypropane.com/blog.html",
    "description": "Propane tips, safety guides, cost comparisons, and how-to articles",
    "publisher": {
        "@type": "Organization",
        "name": "FindMyPropane.com",
        "logo": "https://findmypropane.com/images/logo.png"
    }
})

# ── privacy.html ──────────────────────────────────────────────────────────────
inject_schema(BASE / "privacy.html", {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Privacy Policy — FindMyPropane.com",
    "url": "https://findmypropane.com/privacy.html",
    "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://findmypropane.com/"},
            {"@type": "ListItem", "position": 2, "name": "Privacy Policy", "item": "https://findmypropane.com/privacy.html"}
        ]
    }
})

# ── map.html ──────────────────────────────────────────────────────────────────
inject_schema(BASE / "map.html", {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Propane Locations Map — FindMyPropane.com",
    "url": "https://findmypropane.com/map.html",
    "description": "Interactive map of propane refill and exchange locations across Texas and New Mexico",
    "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://findmypropane.com/"},
            {"@type": "ListItem", "position": 2, "name": "Map", "item": "https://findmypropane.com/map.html"}
        ]
    }
})

print("\nDone.")
