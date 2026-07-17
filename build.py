#!/usr/bin/env python3
"""
Static site generator for FindMyPropane.com.

Renders the homepage, state pages, and all city pages from:
  - propane-directory/data/listings.json  (business listings)
  - propane-directory/data/cities.json    (per-city editorial content + FAQs)
  - propane-directory/data/states.json    (per-state editorial content)

All listings are rendered directly into the HTML so search engines and the
AdSense reviewer see the full content without JavaScript. Run after any data
or content change:

    python3 build.py
"""
import html
import json
import math
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent / "propane-directory"
BASE_URL = "https://findmypropane.com"
ADSENSE_CLIENT = "ca-pub-3324674498417567"
TODAY = date.today().isoformat()

CITIES = [
    # name (matches listings.json), page, state, display label
    ("Houston", "houston.html", "TX", "Houston"),
    ("Dallas", "dallas.html", "TX", "Dallas"),
    ("San Antonio", "san-antonio.html", "TX", "San Antonio"),
    ("Austin", "austin.html", "TX", "Austin"),
    ("Fort Worth", "fort-worth.html", "TX", "Fort Worth"),
    ("Arlington", "arlington.html", "TX", "Arlington"),
    ("Corpus Christi", "corpus-christi.html", "TX", "Corpus Christi"),
    ("El Paso", "el-paso.html", "TX", "El Paso"),
    ("Horizon City", "horizon-city.html", "TX", "Horizon City"),
    ("Socorro", "socorro-tx.html", "TX", "Socorro"),
    ("Canutillo", "canutillo-tx.html", "TX", "Canutillo"),
    ("Fabens", "fabens-tx.html", "TX", "Fabens"),
    ("Anthony", "anthony-tx.html", "TX", "Anthony (TX/NM)"),
    ("Albuquerque", "albuquerque.html", "NM", "Albuquerque"),
    ("Santa Fe", "santa-fe.html", "NM", "Santa Fe"),
    ("Las Cruces", "las-cruces.html", "NM", "Las Cruces"),
    ("Alamogordo", "alamogordo.html", "NM", "Alamogordo"),
    ("Deming", "deming.html", "NM", "Deming"),
]

STATE_NAMES = {"TX": "Texas", "NM": "New Mexico"}
STATE_PAGES = {"TX": "texas.html", "NM": "new-mexico.html"}

GUIDES = [
    ("blog/cheapest-propane-near-me.html",
     "How to Find the Cheapest Propane Near You",
     "Compare refill vs exchange prices and learn 7 proven ways to pay less for propane."),
    ("blog/propane-exchange-vs-refill.html",
     "Propane Exchange vs Refill: Which Is the Better Deal?",
     "Exchange tanks are only filled to 15 lbs and cost more per gallon. Here's the full cost breakdown."),
    ("blog/how-much-does-propane-cost-per-gallon.html",
     "How Much Does Propane Cost Per Gallon?",
     "Current price ranges, what drives them up or down, and how to lock in a better rate."),
    ("blog/how-long-does-20lb-propane-tank-last.html",
     "How Long Does a 20lb Propane Tank Last?",
     "Burn time estimates for grills, patio heaters, fire pits, and camp stoves."),
    ("blog/how-to-refill-propane-tank.html",
     "How to Refill a Propane Tank: Step-by-Step",
     "What to expect at a refill station and safety checks to do before you go."),
    ("blog/how-to-store-propane-tanks-safely.html",
     "How to Store Propane Tanks Safely",
     "Temperature limits, indoor vs outdoor rules, and when to retire an old tank."),
]


def esc(s):
    return html.escape(str(s), quote=True)


def load_data():
    listings = json.loads((ROOT / "data" / "listings.json").read_text())
    cities = json.loads((ROOT / "data" / "cities.json").read_text())
    states = json.loads((ROOT / "data" / "states.json").read_text())
    by_city = {}
    for l in listings:
        by_city.setdefault(l["city"], []).append(l)
    for city in by_city:
        by_city[city].sort(
            key=lambda l: (
                l.get("rating") is not None,
                l.get("rating") or 0,
                l.get("reviewCount") or 0,
            ),
            reverse=True,
        )
    return listings, by_city, cities, states


# ---------------------------------------------------------------------------
# Shared fragments
# ---------------------------------------------------------------------------

def head_html(title, description, canonical_path, schemas, og_type="website",
              include_verification=False):
    schema_tags = "\n".join(
        '    <script type="application/ld+json">\n' + json.dumps(s, indent=2)
        + "\n    </script>"
        for s in schemas
    )
    verification = (
        '\n    <meta name="google-site-verification" '
        'content="ZLURmG6y8X0EaOgrUtOy6ULY9WfrQ1NNuwXbmps1Ius">'
        if include_verification else ""
    )
    canonical = f"{BASE_URL}/{canonical_path}" if canonical_path else f"{BASE_URL}/"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(title)}</title>
    <meta name="description" content="{esc(description)}">{verification}
    <link rel="icon" href="images/favicon.svg" type="image/svg+xml">
    <link rel="canonical" href="{canonical}">
    <meta property="og:title" content="{esc(title)}">
    <meta property="og:description" content="{esc(description)}">
    <meta property="og:type" content="{og_type}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="{BASE_URL}/images/og-image.svg">
    <meta property="og:site_name" content="FindMyPropane.com">
    <meta name="twitter:card" content="summary">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">
    <link rel="stylesheet" href="css/style.css">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE_CLIENT}" crossorigin="anonymous"></script>
{schema_tags}
</head>
"""


NAV_LINKS = [
    ("index.html", "Home"),
    ("texas.html", "Texas"),
    ("new-mexico.html", "New Mexico"),
    ("blog.html", "Blog"),
    ("map.html", "Map"),
    ("about.html", "About"),
    ("contact.html", "Contact"),
]


def header_html(active=""):
    current = ' aria-current="page"'
    links = "\n".join(
        f'                <a href="{href}"{current if href == active else ""}>{label}</a>'
        for href, label in NAV_LINKS
    )
    return f"""<body>
    <header>
        <div class="container">
            <a href="index.html" class="brand" aria-label="FindMyPropane.com home"><img src="images/logo.png" alt="" class="site-logo" width="44" height="44"><span class="brand-name">FindMy<span>Propane</span></span></a>
            <nav aria-label="Main navigation">
{links}
            </nav>
        </div>
    </header>
"""


def footer_html(by_city):
    def city_link(name):
        info = next(c for c in CITIES if c[0] == name)
        n = len(by_city.get(name, []))
        return f'<li><a href="{info[1]}">{esc(info[3])} ({n})</a></li>'

    tx_links = "\n                        ".join(
        city_link(n) for n in ["Houston", "Dallas", "San Antonio", "Austin",
                               "Fort Worth", "Arlington", "Corpus Christi", "El Paso"]
    )
    nm_links = "\n                        ".join(
        city_link(n) for n in ["Albuquerque", "Santa Fe", "Las Cruces",
                               "Alamogordo", "Deming"]
    )
    return f"""    <footer>
        <div class="container">
            <div class="footer-cols">
                <div>
                    <h3>FindMyPropane.com</h3>
                    <p>An independent directory of propane refill and exchange locations across Texas and New Mexico — with real addresses, phone numbers, service types, and customer ratings for every listing.</p>
                </div>
                <div>
                    <h3>Texas</h3>
                    <ul>
                        {tx_links}
                        <li><a href="texas.html">All Texas cities →</a></li>
                    </ul>
                </div>
                <div>
                    <h3>New Mexico</h3>
                    <ul>
                        {nm_links}
                        <li><a href="new-mexico.html">All New Mexico cities →</a></li>
                    </ul>
                </div>
                <div>
                    <h3>Resources</h3>
                    <ul>
                        <li><a href="blog.html">Propane Guides</a></li>
                        <li><a href="map.html">Location Map</a></li>
                        <li><a href="about.html">About</a></li>
                        <li><a href="contact.html">Contact</a></li>
                        <li><a href="privacy.html">Privacy Policy</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 FindMyPropane.com. All rights reserved.</p>
                <p>Listing details can change — call ahead to confirm hours and pricing.</p>
            </div>
        </div>
    </footer>
"""


def stars_html(rating):
    full = int(round(rating))
    return "★" * full + "☆" * (5 - full)


def tel_href(phone):
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        digits = "1" + digits
    return f"tel:+{digits}"


def listing_card(l):
    services = [s.strip().lower() for s in l["type"].split(",")]
    tags = "".join(
        f'<span class="service-tag{" exchange" if s == "exchange" else ""}">{esc(s.capitalize())}</span>'
        for s in services
    )
    rating = ""
    if l.get("rating"):
        reviews = l.get("reviewCount")
        count = f" ({reviews} review{'s' if reviews != 1 else ''})" if reviews else ""
        rating = (f'\n                    <div class="rating">{stars_html(l["rating"])}'
                  f'<span class="score">{l["rating"]}{count}</span></div>')
    website = ""
    if l.get("website"):
        website = (f'\n                        <a class="btn-website" href="{esc(l["website"])}"'
                   ' target="_blank" rel="noopener nofollow">Website</a>')
    dest = f"{l['address']}, {l['city']}, {l['state']}"
    maps = ("https://www.google.com/maps/dir/?api=1&destination="
            + html.escape(re.sub(r"\s+", "+", dest)))
    return f"""                <div class="listing-card" data-name="{esc(l['name'].lower())}" data-city="{esc(l['city'].lower())}" data-services="{esc(','.join(services))}">
                    <h3>{esc(l['name'])}</h3>{rating}
                    <p class="address">{esc(l['address'])}, {esc(l['city'])}, {esc(l['state'])}</p>
                    <p class="phone"><a href="{tel_href(l['phone'])}">{esc(l['phone'])}</a></p>
                    <div class="services">{tags}</div>
                    <div class="card-actions">
                        <a class="btn-directions" href="{maps}" target="_blank" rel="noopener">Directions</a>{website}
                    </div>
                </div>"""


def city_card(name, by_city, note=None):
    info = next(c for c in CITIES if c[0] == name)
    n = len(by_city.get(name, []))
    note = note or "Propane refill &amp; exchange"
    return f"""                <a href="{info[1]}" class="city-card">
                    <h3>{esc(info[3])}</h3>
                    <p>{note}</p>
                    <span class="count">{n} location{'s' if n != 1 else ''} →</span>
                </a>"""


def search_box(placeholder="Search by city or business name…"):
    return f"""            <div class="search-box" role="search">
                <input type="text" id="searchInput" placeholder="{placeholder}" aria-label="Search listings">
                <select id="serviceType" aria-label="Service type">
                    <option value="">All Services</option>
                    <option value="refill">Refill</option>
                    <option value="exchange">Exchange</option>
                </select>
                <button type="button" onclick="searchListings()">Search</button>
            </div>"""


# ---------------------------------------------------------------------------
# Schema builders
# ---------------------------------------------------------------------------

def business_schema(l):
    item = {
        "@type": "LocalBusiness",
        "name": l["name"],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": l["address"],
            "addressLocality": l["city"],
            "addressRegion": l["state"],
            "addressCountry": "US",
        },
        "telephone": l["phone"],
    }
    if l.get("rating"):
        item["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": l["rating"],
            "reviewCount": l.get("reviewCount") or 1,
        }
    if l.get("lat") and l.get("lng"):
        item["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": l["lat"],
            "longitude": l["lng"],
        }
    return item


def itemlist_schema(name, description, items):
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": name,
        "description": description,
        "numberOfItems": len(items),
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "item": business_schema(l)}
            for i, l in enumerate(items)
        ],
    }


def breadcrumb_schema(crumbs):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name,
             "item": f"{BASE_URL}/{path}" if path else f"{BASE_URL}/"}
            for i, (name, path) in enumerate(crumbs)
        ],
    }


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def faq_schema(faqs):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": strip_tags(f["q"]),
             "acceptedAnswer": {"@type": "Answer", "text": strip_tags(f["a"])}}
            for f in faqs
        ],
    }


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

def centroid(items):
    pts = [(l["lat"], l["lng"]) for l in items if l.get("lat") and l.get("lng")]
    if not pts:
        return None
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def miles(a, b):
    lat1, lng1, lat2, lng2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    h = (math.sin((lat2 - lat1) / 2) ** 2
         + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2)
    return 3959 * 2 * math.asin(math.sqrt(h))


def nearby_cities(city_name, by_city, limit=4):
    centers = {name: centroid(items) for name, items in by_city.items()}
    here = centers.get(city_name)
    if not here:
        return []
    dists = []
    for name, c in centers.items():
        if name == city_name or c is None or name not in {x[0] for x in CITIES}:
            continue
        dists.append((miles(here, c), name))
    dists.sort()
    return dists[:limit]


def build_city_page(name, page, state, label, by_city, cities_content):
    items = by_city.get(name, [])
    content = cities_content[name]
    n = len(items)
    st_name = STATE_NAMES[state]
    st_page = STATE_PAGES[state]

    title = f"Propane Refill & Exchange in {label}, {state} — {n} Location{'s' if n != 1 else ''} | FindMyPropane"
    description = re.sub(r"^\d+", str(n), content["description"]) if content["description"] else \
        f"{n} propane refill and exchange locations in {label}, {state} with addresses, phone numbers, and ratings."

    schemas = [
        itemlist_schema(f"{label} Propane Suppliers",
                        f"Propane refill and exchange locations in {label}, {state}", items),
        breadcrumb_schema([("Home", ""), (st_name, st_page), (label, page)]),
    ]
    if content["faqs"]:
        schemas.append(faq_schema(content["faqs"]))

    cards = "\n".join(listing_card(l) for l in items)

    faq_items = "\n".join(
        f"""            <div class="faq-item">
                <h3>{f['q']}</h3>
                <p>{f['a']}</p>
            </div>""" for f in content["faqs"]
    )

    nearby = nearby_cities(name, by_city)
    nearby_html = ""
    if nearby:
        nearby_cards = "\n".join(
            city_card(nm, by_city, note=f"~{int(round(d))} miles away")
            for d, nm in nearby
        )
        nearby_html = f"""
        <section class="nearby">
            <h2>Propane in Nearby Cities</h2>
            <div class="city-grid">
{nearby_cards}
            </div>
        </section>
"""

    info_heading = content.get("info_heading") or f"About Propane Services in {label}"

    body = f"""{header_html(active=st_page)}
    <div class="hero-band">
        <div class="container">
            <nav class="breadcrumbs" aria-label="Breadcrumb">
                <a href="index.html">Home</a><span class="sep">›</span><a href="{st_page}">{st_name}</a><span class="sep">›</span>{esc(label)}
            </nav>
            <h1>Propane Refill &amp; Exchange in {esc(label)}, {state}</h1>
            <p class="city-intro">{content['intro']}</p>
{search_box('Filter by business name…')}
            <div class="hero-stats">
                <span>{n} location{'s' if n != 1 else ''}</span>
                <span>Refill &amp; exchange</span>
                <span>Updated {TODAY}</span>
            </div>
        </div>
    </div>

    <main class="container">
        <section class="listings">
            <div class="section-head">
                <h2>{esc(label)} Propane Locations</h2>
                <a class="see-all" href="map.html">View on map →</a>
            </div>
            <div id="listingsContainer" class="listings-grid">
{cards}
            </div>
            <p class="no-results" id="noResults" hidden>No listings match your search.</p>
        </section>

        <section class="city-info">
            <h2>{info_heading}</h2>
            {content['info_html']}
        </section>

        <section class="faq">
            <h2>Frequently Asked Questions — Propane in {esc(label)}</h2>
{faq_items}
        </section>
{nearby_html}    </main>

{footer_html(by_city)}
    <script src="js/main.js"></script>
</body>
</html>
"""
    out = head_html(title, description, page, schemas) + body
    (ROOT / page).write_text(out)


def build_state_page(state, by_city, states_content):
    st_name = STATE_NAMES[state]
    page = STATE_PAGES[state]
    state_cities = [c for c in CITIES if c[2] == state]
    if state == "NM":
        state_cities = state_cities + [next(c for c in CITIES if c[0] == "Anthony")]
    total = sum(len(by_city.get(c[0], [])) for c in CITIES if c[2] == state)
    n_cities = len(state_cities)

    title = f"Propane Refill & Exchange in {st_name} — {total} Locations | FindMyPropane"
    description = (f"Browse {total} propane refill and exchange locations across {st_name}. "
                   f"Addresses, phone numbers, service types, and ratings for suppliers in "
                   f"{', '.join(c[3] for c in state_cities[:4])}, and more.")

    schemas = [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": f"{st_name} Propane Suppliers",
            "description": f"Browse {total} propane refill and exchange locations across {st_name}",
            "url": f"{BASE_URL}/{page}",
        },
        breadcrumb_schema([("Home", ""), (st_name, page)]),
    ]

    city_cards = "\n".join(city_card(c[0], by_city) for c in state_cities)

    featured = sorted(
        [l for c in CITIES if c[2] == state for l in by_city.get(c[0], [])
         if l.get("rating") and (l.get("reviewCount") or 0) >= 10],
        key=lambda l: (l["rating"], l.get("reviewCount") or 0), reverse=True,
    )[:6]
    featured_cards = "\n".join(listing_card(l) for l in featured)

    about = states_content[state]["about_html"]

    body = f"""{header_html(active=page)}
    <div class="hero-band">
        <div class="container">
            <nav class="breadcrumbs" aria-label="Breadcrumb">
                <a href="index.html">Home</a><span class="sep">›</span>{st_name}
            </nav>
            <h1>Propane Refill &amp; Exchange in {st_name}</h1>
            <p class="tagline">{total} propane locations across {n_cities} {st_name} cities — every listing includes the address, phone number, services offered, and customer rating.</p>
{search_box()}
            <div class="hero-stats">
                <span>{total} locations</span>
                <span>{n_cities} cities</span>
                <span>Updated {TODAY}</span>
            </div>
        </div>
    </div>

    <main class="container">
        <section id="searchResults" class="listings" hidden>
            <h2>Search Results</h2>
            <div id="listingsContainer" class="listings-grid"></div>
            <p class="no-results" id="noResults" hidden>No listings match your search.</p>
        </section>

        <section class="cities">
            <h2 style="margin:2rem 0 1.25rem;">Browse by City</h2>
            <div class="city-grid">
{city_cards}
            </div>
        </section>

        <section class="featured">
            <div class="section-head">
                <h2>Top-Rated {st_name} Propane Suppliers</h2>
                <a class="see-all" href="map.html">View on map →</a>
            </div>
            <div class="listings-grid">
{featured_cards}
            </div>
        </section>

        <section class="about-directory">
            {about}
        </section>
    </main>

{footer_html(by_city)}
    <script src="js/main.js"></script>
    <script>enableGlobalSearch('{state}');</script>
</body>
</html>
"""
    out = head_html(title, description, page, schemas) + body
    (ROOT / page).write_text(out)


def build_index(listings, by_city):
    total = len(listings)
    n_cities = len(CITIES)
    title = "Find Propane Near You — Refill & Exchange Directory for Texas & New Mexico"
    description = (f"Find propane refill and exchange locations near you. {total} verified listings "
                   f"across {n_cities} cities in Texas and New Mexico — addresses, phone numbers, "
                   "prices, and customer ratings.")

    schemas = [
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "FindMyPropane.com",
            "url": f"{BASE_URL}/",
            "description": "Propane refill and exchange directory for Texas and New Mexico",
        },
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "FindMyPropane.com",
            "url": f"{BASE_URL}/",
            "logo": f"{BASE_URL}/images/logo.png",
            "description": "Independent propane refill and exchange directory covering Texas and New Mexico",
        },
    ]

    tx_cards = "\n".join(city_card(c[0], by_city) for c in CITIES if c[2] == "TX")
    nm_cards = "\n".join(city_card(c[0], by_city) for c in CITIES if c[2] == "NM")

    featured = sorted(
        [l for l in listings if l.get("rating") and (l.get("reviewCount") or 0) >= 25],
        key=lambda l: (l["rating"], l.get("reviewCount") or 0), reverse=True,
    )[:6]
    featured_cards = "\n".join(listing_card(l) for l in featured)

    guide_cards = "\n".join(
        f"""                <a href="{href}" class="blog-card">
                    <h3>{esc(t)}</h3>
                    <p>{esc(d)}</p>
                    <span class="read-more">Read More →</span>
                </a>""" for href, t, d in GUIDES
    )

    body = f"""{header_html(active="index.html")}
    <div class="hero-band">
        <div class="container">
            <h1>Find Propane Refill &amp; Exchange Locations Near You</h1>
            <p class="tagline">{total} verified propane locations across {n_cities} cities in Texas and New Mexico — with addresses, phone numbers, services, and customer ratings for every listing.</p>
{search_box()}
            <div class="hero-stats">
                <span>{total} locations</span>
                <span>{n_cities} cities</span>
                <span>2 states</span>
                <span>Updated {TODAY}</span>
            </div>
        </div>
    </div>

    <main class="container">
        <section id="searchResults" class="listings" hidden>
            <h2>Search Results</h2>
            <div id="listingsContainer" class="listings-grid"></div>
            <p class="no-results" id="noResults" hidden>No listings match your search.</p>
        </section>

        <section class="cities">
            <div class="section-head">
                <h2>Texas Propane Locations</h2>
                <a class="see-all" href="texas.html">All Texas →</a>
            </div>
            <div class="city-grid">
{tx_cards}
            </div>
            <div class="section-head">
                <h2>New Mexico Propane Locations</h2>
                <a class="see-all" href="new-mexico.html">All New Mexico →</a>
            </div>
            <div class="city-grid">
{nm_cards}
            </div>
        </section>

        <section class="featured">
            <div class="section-head">
                <h2>Top-Rated Propane Suppliers</h2>
                <a class="see-all" href="map.html">View on map →</a>
            </div>
            <div class="listings-grid">
{featured_cards}
            </div>
        </section>

        <section class="about-directory">
            <h2>How This Directory Works</h2>
            <p>FindMyPropane lists propane refill and exchange locations across Texas and New Mexico. Each listing includes the business name, address, phone number, available services, and customer ratings. Use the search bar above to find locations by city or business name, or browse by city using the cards above.</p>
            <p>Propane suppliers are categorized as <strong>Refill</strong> (fill your existing tank to capacity), <strong>Exchange</strong> (swap your empty tank for a pre-filled one), or both. Refill is generally the better value — you pay only for the gas you receive, and your tank is filled to its full rated capacity. Exchange kiosks, commonly found at hardware and grocery stores, are convenient but typically only fill tanks to 75% capacity. Read our <a href="blog/propane-exchange-vs-refill.html">refill vs. exchange guide</a> for the full cost breakdown.</p>
            <p>If you operate a propane business and would like to be listed, use the <a href="contact.html">contact page</a> to submit your information.</p>
        </section>

        <section class="blog">
            <div class="section-head">
                <h2>Propane Guides &amp; Tips</h2>
                <a class="see-all" href="blog.html">All guides →</a>
            </div>
            <div class="blog-grid">
{guide_cards}
            </div>
        </section>
    </main>

    <section class="email-capture">
        <div class="container">
            <h2>Get Notified When We Expand</h2>
            <p>We're adding new states regularly. Leave your email and we'll let you know when we reach your area.</p>
            <a href="https://forms.gle/S1kMmPhwEY6A7UHv8" target="_blank" rel="noopener" class="btn-notify">Notify Me</a>
        </div>
    </section>

{footer_html(by_city)}
    <script src="js/main.js"></script>
    <script>enableGlobalSearch();</script>
</body>
</html>
"""
    out = head_html(title, description, "", schemas, include_verification=True) + body
    (ROOT / "index.html").write_text(out)


def build_sitemap():
    pages = []
    for p in sorted(ROOT.glob("*.html")) + sorted((ROOT / "blog").glob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel == "index.html":
            loc, priority, freq = f"{BASE_URL}/", "1.0", "weekly"
        elif rel in ("texas.html", "new-mexico.html"):
            loc, priority, freq = f"{BASE_URL}/{rel}", "0.9", "weekly"
        elif rel.startswith("blog/"):
            loc, priority, freq = f"{BASE_URL}/{rel}", "0.7", "monthly"
        elif rel in ("about.html", "contact.html"):
            loc, priority, freq = f"{BASE_URL}/{rel}", "0.5", "monthly"
        elif rel == "privacy.html":
            loc, priority, freq = f"{BASE_URL}/{rel}", "0.3", "yearly"
        elif rel in ("blog.html", "map.html"):
            loc, priority, freq = f"{BASE_URL}/{rel}", "0.8", "weekly"
        else:
            loc, priority, freq = f"{BASE_URL}/{rel}", "0.8", "weekly"
        pages.append(
            f"  <url><loc>{loc}</loc><lastmod>{TODAY}</lastmod>"
            f"<changefreq>{freq}</changefreq><priority>{priority}</priority></url>"
        )
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(pages) + "\n</urlset>\n")
    (ROOT / "sitemap.xml").write_text(xml)


def main():
    listings, by_city, cities_content, states_content = load_data()
    for name, page, state, label in CITIES:
        build_city_page(name, page, state, label, by_city, cities_content)
        print(f"built {page} ({len(by_city.get(name, []))} listings)")
    for state in ("TX", "NM"):
        build_state_page(state, by_city, states_content)
        print(f"built {STATE_PAGES[state]}")
    build_index(listings, by_city)
    print("built index.html")
    build_sitemap()
    print("built sitemap.xml")


if __name__ == "__main__":
    main()
