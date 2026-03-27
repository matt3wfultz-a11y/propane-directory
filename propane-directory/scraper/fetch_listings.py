#!/usr/bin/env python3
"""
Fetch real propane business listings from the Google Places API
and write them to ../data/listings.json.

Usage:
    GOOGLE_PLACES_API_KEY=your_key python3 fetch_listings.py

Setup (free — covered by Google's $200/month credit):
1. Go to https://console.cloud.google.com/
2. Create a project, enable billing (won't be charged within free tier)
3. Enable the "Places API" under APIs & Services
4. Create an API key under APIs & Services → Credentials
"""

import json
import os
import re
import sys
import time

import requests

PLACES_BASE = "https://maps.googleapis.com/maps/api/place"

CITIES = [
    "Houston, TX",
    "Dallas, TX",
    "San Antonio, TX",
    "Austin, TX",
]

EXCHANGE_NAMES = {"blue rhino", "amerigas", "u-haul", "ferrellgas exchange"}

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "../data/listings.json")


def infer_service_type(name):
    n = name.lower()
    if any(brand in n for brand in EXCHANGE_NAMES) or ("exchange" in n and "refill" not in n):
        return "exchange"
    if "refill" in n or "fill station" in n:
        return "refill"
    return "refill,exchange"


def format_phone(raw):
    """Normalise to (XXX) XXX-XXXX."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 11 and digits[0] == "1":
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return raw or ""


def text_search(api_key, query, page_token=None):
    params = {"query": query, "key": api_key}
    if page_token:
        params["pagetoken"] = page_token
    resp = requests.get(f"{PLACES_BASE}/textsearch/json", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def place_details(api_key, place_id):
    params = {
        "place_id": place_id,
        "fields": "formatted_phone_number,website,business_status",
        "key": api_key,
    }
    resp = requests.get(f"{PLACES_BASE}/details/json", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json().get("result", {})


def fetch_city(api_key, location):
    city_name = location.split(",")[0].strip()
    print(f"  Fetching {location}...")

    query = f"propane {location}"
    listings = []
    seen = set()
    page_token = None

    for page in range(3):  # up to 3 pages = 60 results max
        data = text_search(api_key, query, page_token)
        status = data.get("status")

        if status not in ("OK", "ZERO_RESULTS"):
            print(f"    API status: {status}")
            break

        for place in data.get("results", []):
            if place.get("business_status") == "PERMANENTLY_CLOSED":
                continue

            name = place.get("name", "").strip()
            if not name:
                continue

            key = name.lower()
            if key in seen:
                continue
            seen.add(key)

            # Parse address — strip city/state/country, keep street portion
            full_address = place.get("formatted_address", "")
            # Google returns "123 Main St, Houston, TX 77001, USA"
            parts = full_address.split(",")
            address = parts[0].strip() if parts else full_address

            rating = place.get("rating", 0.0)
            review_count = place.get("user_ratings_total", 0)
            service_type = infer_service_type(name)

            # Fetch phone + website from details endpoint
            details = place_details(api_key, place["place_id"])
            phone = format_phone(details.get("formatted_phone_number", ""))
            website = details.get("website", "")
            time.sleep(0.1)

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

        page_token = data.get("next_page_token")
        if not page_token:
            break

        # Google requires a short delay before using next_page_token
        time.sleep(2)

    print(f"    → {len(listings)} listings for {city_name}")
    return listings


def main():
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
    if not api_key:
        print("Error: GOOGLE_PLACES_API_KEY environment variable is not set.")
        print()
        print("Setup (free — covered by Google's $200/month credit):")
        print("  1. Go to https://console.cloud.google.com/")
        print("  2. Create a project, enable billing")
        print("  3. Enable the 'Places API' under APIs & Services")
        print("  4. Create an API key under APIs & Services → Credentials")
        print()
        print("Then run:  GOOGLE_PLACES_API_KEY=your_key python3 fetch_listings.py")
        sys.exit(1)

    all_listings = []

    for location in CITIES:
        listings = fetch_city(api_key, location)
        all_listings.extend(listings)
        time.sleep(1)

    # Global deduplicate by (name, city)
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

    print(f"\nDone — {len(unique)} total listings saved to {output_path}")


if __name__ == "__main__":
    main()
