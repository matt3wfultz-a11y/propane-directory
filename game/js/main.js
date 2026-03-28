// main.js — Game bootstrap and screen router

'use strict';

/**
 * Navigate to a named screen, optionally passing params.
 * Hides all screens, shows the target, emits enter event.
 */
function navigateTo(screenId, params) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById('screen-' + screenId);
  if (!target) { console.error('Unknown screen:', screenId); return; }
  target.classList.remove('hidden');
  GameBus.emit('screen:' + screenId + ':enter', params || {});
}

// Boot sequence
document.addEventListener('DOMContentLoaded', function () {
  navigateTo('title');
});
