let listingsData = [];

async function loadListings() {
    try {
        const response = await fetch('data/listings.json');
        listingsData = await response.json();
    } catch (error) {
        console.error('Error loading listings:', error);
        listingsData = [];
    }
}

function createListingCard(listing) {
    const services = listing.type.split(',').map(s => s.trim());
    const serviceTags = services.map(s => `<span class="service-tag">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`).join('');

    const stars = listing.rating ? '★'.repeat(Math.floor(listing.rating)) + (listing.rating % 1 >= 0.5 ? '½' : '') : '';

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: listing.name,
        address: {
            '@type': 'PostalAddress',
            streetAddress: listing.address,
            addressLocality: listing.city,
            addressRegion: listing.state,
            addressCountry: 'US'
        },
        telephone: listing.phone,
        description: `Propane ${listing.type} services in ${listing.city}, TX`
    };
    if (listing.rating) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: listing.rating,
            bestRating: '5',
            worstRating: '1',
            reviewCount: listing.reviewCount || '10'
        };
    }
    if (listing.website) schema.url = listing.website;

    return `
        <div class="listing-card">
            <script type="application/ld+json">${JSON.stringify(schema)}<\/script>
            ${listing.rating ? `<div class="rating">${stars} (${listing.rating})</div>` : ''}
            <h4>${listing.name}</h4>
            <p class="address">${listing.address}, ${listing.city}, ${listing.state}</p>
            <p class="phone"><a href="tel:${listing.phone}">${listing.phone}</a></p>
            <div class="services">${serviceTags}</div>
            ${listing.website ? `<p><a href="${listing.website}" target="_blank" rel="noopener">Visit Website</a></p>` : ''}
        </div>
    `;
}

function createInlineAdUnit() {
    return `<div class="ad-inline">
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-3324674498417567"
             data-ad-slot="YOUR_INLINE_AD_SLOT"
             data-ad-format="fluid"
             data-ad-layout-key="-6t+ed+2i-1n-4w">
        </ins>
    </div>`;
}

function displayListings(listings, containerId = 'listingsContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (listings.length === 0) {
        container.innerHTML = '<p>No listings found. Try a different search.</p>';
        return;
    }

    const parts = [];
    listings.forEach((listing, i) => {
        parts.push(createListingCard(listing));
        if ((i + 1) % 3 === 0 && i + 1 < listings.length) {
            parts.push(createInlineAdUnit());
        }
    });
    container.innerHTML = parts.join('');

    // Initialize any AdSense units injected into the grid
    container.querySelectorAll('.adsbygoogle').forEach(() => {
        (adsbygoogle = window.adsbygoogle || []).push({});
    });
}

async function loadFeaturedListings() {
    await loadListings();
    const featured = listingsData.slice(0, 6);
    displayListings(featured, 'featuredListings');
}

async function loadListingsByCity(city) {
    await loadListings();
    const filtered = listingsData.filter(listing => 
        listing.city.toLowerCase() === city.toLowerCase()
    );
    displayListings(filtered);
}

function searchListings() {
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const serviceType = document.getElementById('serviceType')?.value || '';
    const container = document.getElementById('listingsContainer');
    
    if (!container) {
        window.location.href = `index.html?search=${encodeURIComponent(searchInput)}&service=${encodeURIComponent(serviceType)}`;
        return;
    }
    
    const filtered = listingsData.filter(listing => {
        const matchesSearch = listing.name.toLowerCase().includes(searchInput) ||
                            listing.city.toLowerCase().includes(searchInput);
        const matchesService = !serviceType || listing.type.toLowerCase().includes(serviceType);
        
        return matchesSearch && matchesService;
    });
    
    displayListings(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    const service = params.get('service');
    
    if (search || service) {
        document.getElementById('searchInput').value = search || '';
        document.getElementById('serviceType').value = service || '';
        searchListings();
    }
});
