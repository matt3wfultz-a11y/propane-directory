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
    
    return `
        <div class="listing-card">
            ${listing.rating ? `<div class="rating">${stars} (${listing.rating})</div>` : ''}
            <h4>${listing.name}</h4>
            <p class="address">${listing.address}</p>
            <p class="phone">${listing.phone}</p>
            <div class="services">${serviceTags}</div>
            ${listing.website ? `<p><a href="${listing.website}" target="_blank">Website</a></p>` : ''}
        </div>
    `;
}

function displayListings(listings, containerId = 'listingsContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (listings.length === 0) {
        container.innerHTML = '<p>No listings found. Try a different search.</p>';
        return;
    }
    
    container.innerHTML = listings.map(listing => createListingCard(listing)).join('');
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
