/*
 * FindMyPropane — search & filtering.
 *
 * Listings are rendered statically into the HTML at build time (see build.py).
 * On city pages this script only filters the pre-rendered cards. On the
 * homepage and state pages it fetches data/listings.json to search across
 * every city.
 */

var globalSearchState = null; // null = city page (filter static cards), '' = all, 'TX'/'NM' = state
var listingsData = [];

function enableGlobalSearch(state) {
    globalSearchState = state || '';
}

function starString(rating) {
    var full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function telHref(phone) {
    var digits = phone.replace(/\D/g, '');
    if (digits.length === 10) digits = '1' + digits;
    return 'tel:+' + digits;
}

function escapeHtml(s) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
}

function createListingCard(l) {
    var services = l.type.split(',').map(function (s) { return s.trim().toLowerCase(); });
    var tags = services.map(function (s) {
        return '<span class="service-tag' + (s === 'exchange' ? ' exchange' : '') + '">' +
            s.charAt(0).toUpperCase() + s.slice(1) + '</span>';
    }).join('');
    var rating = '';
    if (l.rating) {
        var count = l.reviewCount ? ' (' + l.reviewCount + ' review' + (l.reviewCount !== 1 ? 's' : '') + ')' : '';
        rating = '<div class="rating">' + starString(l.rating) +
            '<span class="score">' + l.rating + count + '</span></div>';
    }
    var dest = encodeURIComponent(l.address + ', ' + l.city + ', ' + l.state);
    var website = l.website
        ? '<a class="btn-website" href="' + escapeHtml(l.website) + '" target="_blank" rel="noopener nofollow">Website</a>'
        : '';
    return '<div class="listing-card">' +
        '<h3>' + escapeHtml(l.name) + '</h3>' + rating +
        '<p class="address">' + escapeHtml(l.address) + ', ' + escapeHtml(l.city) + ', ' + l.state + '</p>' +
        '<p class="phone"><a href="' + telHref(l.phone) + '">' + escapeHtml(l.phone) + '</a></p>' +
        '<div class="services">' + tags + '</div>' +
        '<div class="card-actions">' +
        '<a class="btn-directions" href="https://www.google.com/maps/dir/?api=1&destination=' + dest + '" target="_blank" rel="noopener">Directions</a>' +
        website + '</div></div>';
}

async function loadListings() {
    if (listingsData.length) return;
    try {
        var response = await fetch('data/listings.json');
        listingsData = await response.json();
    } catch (e) {
        listingsData = [];
    }
}

/* Filter the statically rendered cards on a city page. */
function filterStaticCards(query, service) {
    var container = document.getElementById('listingsContainer');
    var noResults = document.getElementById('noResults');
    var shown = 0;
    container.querySelectorAll('.listing-card').forEach(function (card) {
        var matches =
            (!query || (card.dataset.name || '').indexOf(query) !== -1 ||
                (card.dataset.city || '').indexOf(query) !== -1) &&
            (!service || (card.dataset.services || '').indexOf(service) !== -1);
        card.style.display = matches ? '' : 'none';
        if (matches) shown++;
    });
    if (noResults) noResults.hidden = shown > 0;
}

/* Search all listings (homepage / state pages). */
async function globalSearch(query, service) {
    await loadListings();
    var results = listingsData.filter(function (l) {
        var inState = !globalSearchState || l.state === globalSearchState;
        var matchesQuery = !query ||
            l.name.toLowerCase().indexOf(query) !== -1 ||
            l.city.toLowerCase().indexOf(query) !== -1;
        var matchesService = !service || l.type.toLowerCase().indexOf(service) !== -1;
        return inState && matchesQuery && matchesService;
    });
    var section = document.getElementById('searchResults');
    var container = document.getElementById('listingsContainer');
    var noResults = document.getElementById('noResults');
    if (!section || !container) return;
    section.hidden = false;
    container.innerHTML = results.slice(0, 60).map(createListingCard).join('');
    if (noResults) noResults.hidden = results.length > 0;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function searchListings() {
    var query = (document.getElementById('searchInput') || {}).value || '';
    var service = (document.getElementById('serviceType') || {}).value || '';
    query = query.trim().toLowerCase();
    if (globalSearchState === null) {
        filterStaticCards(query, service);
    } else {
        globalSearch(query, service);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('searchInput');
    var select = document.getElementById('serviceType');
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') searchListings();
        });
        // Live filtering on city pages (static cards, no network needed)
        if (globalSearchState === null) {
            input.addEventListener('input', searchListings);
        }
    }
    if (select) select.addEventListener('change', searchListings);
});
