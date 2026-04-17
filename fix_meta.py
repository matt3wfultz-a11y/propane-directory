#!/usr/bin/env python3
import json, re
from pathlib import Path

BASE = Path("propane-directory")
DATA = BASE / "data" / "listings.json"
listings = json.loads(DATA.read_text())

meta_map = {
    "el-paso.html": {
        "city": "El Paso", "state": "TX",
        "desc_extra": "Includes West Texas Propane, Bob's Propane, DAE Propane, and AmeriGas."
    },
    "houston.html": {
        "city": "Houston", "state": "TX",
        "desc_extra": "Locations across Katy, Sugar Land, The Woodlands, and central Houston."
    },
    "san-antonio.html": {
        "city": "San Antonio", "state": "TX",
        "desc_extra": "Locations across the North Side, South Side, and surrounding suburbs."
    },
    "austin.html": {
        "city": "Austin", "state": "TX",
        "desc_extra": "Locations in Cedar Park, Round Rock, South Austin, and more."
    },
    "fort-worth.html": {
        "city": "Fort Worth", "state": "TX",
        "desc_extra": "Serving Tarrant County and surrounding communities."
    },
    "arlington.html": {
        "city": "Arlington", "state": "TX",
        "desc_extra": "Conveniently located between Dallas and Fort Worth."
    },
    "corpus-christi.html": {
        "city": "Corpus Christi", "state": "TX",
        "desc_extra": "Serving the Coastal Bend region of South Texas."
    },
    "las-cruces.html": {
        "city": "Las Cruces", "state": "NM",
        "desc_extra": "Also serving the El Paso–Las Cruces metro region."
    },
    "santa-fe.html": {
        "city": "Santa Fe", "state": "NM",
        "desc_extra": "Serving northern New Mexico including Taos and Espanola."
    },
    "albuquerque.html": {
        "city": "Albuquerque", "state": "NM",
        "desc_extra": "Serving the greater Albuquerque metro area."
    },
}

for fname, info in meta_map.items():
    fpath = BASE / fname
    if not fpath.exists():
        print(f"SKIP: {fname}")
        continue
    city = info["city"]
    state = info["state"]
    extra = info["desc_extra"]
    count = len([l for l in listings if l.get("city") == city])
    if count == 0:
        count_str = ""
        desc = f"Find propane refill and exchange locations in {city}, {state}. Addresses, phone numbers, and ratings for local propane suppliers. {extra}"
    else:
        desc = f"{count} propane refill and exchange locations in {city}, {state}. Addresses, phone numbers, and ratings for every local supplier. {extra}"

    html = fpath.read_text()
    # Replace meta description
    html = re.sub(
        r'(<meta name="description" content=")[^"]*(")',
        lambda m: f'{m.group(1)}{desc}{m.group(2)}',
        html, count=1
    )
    fpath.write_text(html)
    print(f"UPDATED {fname}: {desc[:80]}...")

print("Done.")
