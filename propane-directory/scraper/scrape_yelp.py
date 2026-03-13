import requests
from bs4 import BeautifulSoup
import json
import time
import random

CITIES = [
    {"name": "Houston", "state": "TX"},
    {"name": "Dallas", "state": "TX"},
    {"name": "San Antonio", "state": "TX"},
    {"name": "Austin", "state": "TX"},
]

SEARCH_TERMS = ["propane refill", "propane exchange", "propane tank"]

def get_yelp_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

def search_yelp(city, search_term):
    base_url = "https://www.yelp.com/search"
    params = {
        "find_desc": search_term,
        "find_loc": f"{city}, TX",
        "start": 0,
    }
    
    listings = []
    
    try:
        response = requests.get(base_url, params=params, headers=get_yelp_headers(), timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, "lxml")
            
            for result in soup.select("div[data-testid='results'] ul li"):
                try:
                    name_elem = result.select_one("h3 a")
                    if not name_elem:
                        continue
                    
                    name = name_elem.get_text(strip=True)
                    url = "https://www.yelp.com" + name_elem.get("href", "")
                    
                    address = ""
                    addr_elem = result.select_one("address")
                    if addr_elem:
                        address = addr_elem.get_text(strip=True)
                    
                    phone = ""
                    phone_elem = result.select_with(text=lambda t: t and "(" in t if result.select_one else None)
                    
                    rating = 0.0
                    rating_elem = result.select_one("span[aria-label*='star']")
                    if rating_elem:
                        aria_label = rating_elem.get("aria-label", "")
                        try:
                            rating = float(aria_label.split()[0])
                        except:
                            pass
                    
                    service_type = "refill,exchange"
                    if "exchange" in search_term:
                        service_type = "exchange"
                    elif "refill" in search_term:
                        service_type = "refill"
                    
                    listings.append({
                        "name": name,
                        "address": address,
                        "city": city,
                        "state": "TX",
                        "phone": phone,
                        "type": service_type,
                        "rating": rating,
                        "website": url
                    })
                    
                except Exception as e:
                    print(f"Error parsing listing: {e}")
                    continue
                    
    except Exception as e:
        print(f"Error searching Yelp for {city} {search_term}: {e}")
    
    return listings

def save_listings(listings, filename="listings.json"):
    with open(filename, "w") as f:
        json.dump(listings, f, indent=2)
    print(f"Saved {len(listings)} listings to {filename}")

def main():
    all_listings = []
    
    for city in CITIES:
        print(f"\nSearching {city['name']}, TX...")
        
        for term in SEARCH_TERMS:
            print(f"  - Searching for: {term}")
            listings = search_yelp(city["name"], term)
            
            for listing in listings:
                if listing not in all_listings:
                    all_listings.append(listing)
            
            time.sleep(random.uniform(1, 3))
    
    save_listings(all_listings)
    print(f"\nTotal unique listings: {len(all_listings)}")

if __name__ == "__main__":
    main()
