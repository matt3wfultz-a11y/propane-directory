// screen-stable.js — Jar collection (stable) and monster detail

'use strict';

let _selectedMonsterUid = null;

GameBus.on('screen:stable:enter', function () {
  _selectedMonsterUid = null;
  _renderStable();
});

function _renderStable() {
  const el = document.getElementById('screen-stable');
  const stable = GameState.stable;

  const cards = stable.length > 0
    ? stable.map(m => renderMonsterCard(m, true)).join('')
    : '<div class="empty-stable">No bugs yet! Go explore.</div>';

  el.innerHTML = `
    <div class="stable-screen">
      <div class="screen-header">
        <button class="btn btn-back" id="btn-back-hub">← Hub</button>
        <h2>🫙 Jar Collection (${stable.length}/30)</h2>
      </div>
      <div class="monster-grid" id="monster-grid">
        ${cards}
      </div>
      <div id="detail-panel" class="detail-panel hidden"></div>
    </div>
  `;

  document.getElementById('btn-back-hub').addEventListener('click', () => navigateTo('hub'));

  document.querySelectorAll('.monster-card[data-uid]').forEach(card => {
    card.addEventListener('click', () => _showDetail(card.dataset.uid));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') _showDetail(card.dataset.uid);
    });
  });
}

function _showDetail(uid) {
  const monster = getMonster(uid);
  if (!monster) return;
  _selectedMonsterUid = uid;

  const detailEl = document.getElementById('detail-panel');
  detailEl.classList.remove('hidden');

  const canBattle = GameState.stable.length > 0 && monster.currentHp > 0;
  const canHeal = monster.currentHp < monster.stats.maxHp;

  detailEl.innerHTML = `
    <div class="detail-close-row">
      <button class="btn btn-back" id="detail-close">✕ Close</button>
      ${canHeal ? `<button class="btn btn-secondary" id="btn-heal-mon">💊 Heal (Rest)</button>` : ''}
      <button class="btn btn-secondary" id="btn-rename-mon">✏️ Rename</button>
      <button class="btn btn-danger btn-sm" id="btn-release-mon">🗑 Release</button>
    </div>
    ${renderMonsterDetail(monster)}
  `;

  document.getElementById('detail-close').addEventListener('click', () => {
    detailEl.classList.add('hidden');
    _selectedMonsterUid = null;
  });

  if (canHeal) {
    document.getElementById('btn-heal-mon').addEventListener('click', () => {
      const mon = getMonster(uid);
      if (mon) {
        healMonster(mon);
        updateMonster(mon);
        _showDetail(uid);
        showToast(`${monsterName(mon)} fully healed!`, 'success');
      }
    });
  }

  document.getElementById('btn-rename-mon').addEventListener('click', () => {
    const mon = getMonster(uid);
    if (!mon) return;
    const newName = prompt(`Rename ${monsterName(mon)}:`, mon.nickname || '');
    if (newName === null) return; // cancelled
    mon.nickname = newName.trim() || null;
    updateMonster(mon);
    _showDetail(uid);
  });

  document.getElementById('btn-release-mon').addEventListener('click', () => {
    const mon = getMonster(uid);
    if (!mon) return;
    if (!confirm(`Release ${monsterName(mon)}? This cannot be undone.`)) return;
    removeFromStable(uid);
    detailEl.classList.add('hidden');
    _renderStable();
    showToast(`${monsterName(mon)} was released.`, 'info');
  });
}
