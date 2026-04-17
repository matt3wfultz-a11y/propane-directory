#!/usr/bin/env python3
import json, re
from pathlib import Path

BASE = Path("propane-directory")
DATA = BASE / "data" / "listings.json"

listings = json.loads(DATA.read_text())

city_files = {
    "El Paso": "el-paso.html",
    "Houston": "houston.html",
    "Dallas": "dallas.html",
    "San Antonio": "san-antonio.html",
    "Austin": "austin.html",
    "Fort Worth": "fort-worth.html",
    "Arlington": "arlington.html",
    "Corpus Christi": "corpus-christi.html",
    "Albuquerque": "albuquerque.html",
    "Las Cruces": "las-cruces.html",
    "Santa Fe": "santa-fe.html",
}

state_map = {
    "El Paso": "TX", "Houston": "TX", "Dallas": "TX", "San Antonio": "TX",
    "Austin": "TX", "Fort Worth": "TX", "Arlington": "TX", "Corpus Christi": "TX",
    "Albuquerque": "NM", "Las Cruces": "NM", "Santa Fe": "NM",
}

for city, fname in city_files.items():
    fpath = BASE / fname
    if not fpath.exists():
        print(f"SKIP (no file): {fname}")
        continue

    city_listings = [l for l in listings if l.get("city") == city]
    if not city_listings:
        print(f"SKIP (no data): {city}")
        continue

    count = len(city_listings)
    state = state_map[city]

    # Build LocalBusiness schema items
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

    schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": f"{city} Propane Suppliers",
        "description": f"Propane refill and exchange locations in {city}, {state}",
        "numberOfItems": count,
        "itemListElement": items
    }

    schema_json = json.dumps(schema, indent=2, ensure_ascii=False)
    new_script = f'<script type="application/ld+json">\n{schema_json}\n    </script>'

    html = fpath.read_text()

    # Replace existing ld+json block
    old_block_pat = re.compile(
        r'<script type="application/ld\+json">.*?</script>',
        re.DOTALL
    )
    if old_block_pat.search(html):
        html = old_block_pat.sub(new_script, html, count=1)
    else:
        # Insert before </head>
        html = html.replace("</head>", f"    {new_script}\n</head>", 1)

    # Fix title: add count
    title_pat = re.compile(r'(<title>)(.*?)(</title>)')
    def fix_title(m):
        old = m.group(2)
        # Replace if it doesn't already have a count
        if str(count) not in old:
            new_t = f"Propane Refill in {city}, {state} — {count} Locations | FindMyPropane.com"
            return f"{m.group(1)}{new_t}{m.group(3)}"
        return m.group(0)
    html = title_pat.sub(fix_title, html, count=1)

    # Fix h2: make it stronger
    h2_pat = re.compile(r'<h2>([^<]*Propane[^<]*)</h2>')
    def fix_h2(m):
        return f"<h2>Propane Refill &amp; Exchange in {city}, {state}</h2>"
    html = h2_pat.sub(fix_h2, html, count=1)

    fpath.write_text(html)
    print(f"UPDATED {fname}: {count} listings, schema injected")

print("Done.")
