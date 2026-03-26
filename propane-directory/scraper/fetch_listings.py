#!/usr/bin/env python3
"""
Fetch real propane business listings from the Yelp Fusion API
and write them to ../data/listings.json.

Usage:
    YELP_API_KEY=your_key python3 fetch_listings.py

Get a free API key at: https://www.yelp.com/developers/v3/manage_app
"""

import json
import os
import re
import sys
import time

import requests

YELP_API_BASE = "https://api.yelp.com/v3"

CITIES = [
    "Houston, TX",
    "Dallas, TX",
    "San Antonio, TX",
    "Austin, TX",
]

# Keywords that indicate exchange-only (tank swap kiosks)
EXCHANGE_NAMES = {"blue rhino", "amerigas", "u-haul"}

# Path to save results (relative to this script)
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "../data/listings.json")


def get_headers(api_key):
    return {"Authorization": f"Bearer {api_key}"}


def infer_service_type(name, categories):
    """Return 'refill', 'exchange', or 'refill,exchange' based on name and categories."""
    name_lower = name.lower()

    is_exchange_brand = any(brand in name_lower for brand in EXCHANGE_NAMES)
    has_exchange_word = "exchange" in name_lower
    has_refill_word = any(w in name_lower for w in ("refill", "fill", "gas supply", "gas & supply"))

    # Check Yelp categories
    cat_aliases = {c["alias"] for c in categories}
    is_propane_dealer = "propanegas" in cat_aliases or "gasstations" in cat_aliases

    if is_exchange_brand or (has_exchange_word and not has_refill_word):
        return "exchange"
    if has_refill_word and not has_exchange_word:
        return "refill"
    if is_propane_dealer:
        return "refill,exchange"
    return "refill,exchange"


def format_phone(raw_phone):
    """Convert +15555551234 → (555) 555-1234."""
    digits = re.sub(r"\D", "", raw_phone)
    if len(digits) == 11 and digits[0] == "1":
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return raw_phone  # return as-is if unexpected format


def search_businesses(api_key, location, offset=0):
    """Search Yelp for propane businesses in a location. Returns raw API response dict."""
    params = {
        "term": "propane",
        "location": location,
        "limit": 50,
        "offset": offset,
        "sort_by": "rating",
    }
    resp = requests.get(
        f"{YELP_API_BASE}/businesses/search",
        headers=get_headers(api_key),
        params=params,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def get_business_website(api_key, business_id):
    """Fetch the business detail page to retrieve the website URL. Returns '' on failure."""
    try:
        resp = requests.get(
            f"{YELP_API_BASE}/businesses/{business_id}",
            headers=get_headers(api_key),
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json().get("website", "")
    except Exception:
        return ""


def fetch_city(api_key, location):
    """Fetch up to 200 propane businesses for a city. Returns list of listing dicts."""
    city_name = location.split(",")[0].strip()
    print(f"  Fetching {location}...")

    businesses = []
    for offset in range(0, 200, 50):
        try:
            data = search_businesses(api_key, location, offset)
        except requests.HTTPError as e:
            print(f"    API error at offset {offset}: {e}")
            break

        batch = data.get("businesses", [])
        if not batch:
            break

        businesses.extend(batch)
        total = data.get("total", 0)
        print(f"    Got {len(businesses)}/{min(total, 200)} businesses")

        if len(businesses) >= total or len(businesses) >= 200:
            break

        time.sleep(0.5)  # be polite to the API

    listings = []
    seen_names = set()

    for biz in businesses:
        name = biz.get("name", "").strip()
        if not name:
            continue

        # Deduplicate within this city by name
        key = name.lower()
        if key in seen_names:
            continue
        seen_names.add(key)

        loc = biz.get("location", {})
        address = loc.get("address1", "").strip()
        if not address:
            continue  # skip listings with no street address

        phone_raw = biz.get("phone", "")
        phone = format_phone(phone_raw) if phone_raw else ""

        rating = biz.get("rating", 0.0)
        review_count = biz.get("review_count", 0)
        categories = biz.get("categories", [])
        service_type = infer_service_type(name, categories)
        is_closed = biz.get("is_closed", False)

        if is_closed:
            continue

        # Fetch website (costs one extra API call per business — comment out if you
        # want to stay well within free-tier limits; website will be empty string)
        website = get_business_website(api_key, biz["id"])
        time.sleep(0.25)

        listings.append({
            "name": name,
            "address": address,
            "city": city_name,
            "state": "TX",
            "phone": phone,
            "type": service_type,
            "rating": rating,
            "reviewCount": review_count,
            "website": website,
        })

    print(f"    → {len(listings)} usable listings for {city_name}")
    return listings


def main():
    api_key = os.environ.get("YELP_API_KEY", "").strip()
    if not api_key:
        print("Error: YELP_API_KEY environment variable is not set.")
        print("  Get a free key at: https://www.yelp.com/developers/v3/manage_app")
        print("  Then run:  YELP_API_KEY=your_key python3 fetch_listings.py")
        sys.exit(1)

    all_listings = []

    for location in CITIES:
        city_listings = fetch_city(api_key, location)
        all_listings.extend(city_listings)
        time.sleep(1)

    # Global deduplication by (name, city) in case of overlapping metro results
    seen = set()
    unique = []
    for listing in all_listings:
        key = (listing["name"].lower(), listing["city"].lower())
        if key not in seen:
            seen.add(key)
            unique.append(listing)

    output_path = os.path.abspath(OUTPUT_PATH)
    with open(output_path, "w") as f:
        json.dump(unique, f, indent=2)

    print(f"\nSaved {len(unique)} listings to {output_path}")


if __name__ == "__main__":
    main()
