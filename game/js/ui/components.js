// components.js — Shared UI rendering helpers

'use strict';

/**
 * Render an HP bar element.
 * @param {number} current
 * @param {number} max
 * @returns {string} HTML
 */
function renderHPBar(current, max) {
  const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  let colorClass = 'hp-high';
  if (pct <= 50) colorClass = 'hp-mid';
  if (pct <= 25) colorClass = 'hp-low';
  return `<div class="hp-bar-wrap">
    <div class="hp-bar ${colorClass}" style="width:${pct}%"></div>
  </div>
  <span class="hp-text">${current}/${max}</span>`;
}

/**
 * Render physical trait icons for a monster.
 * Shows visible loci only (A–E), plus hidden ones if discovered.
 * @param {Object} monster
 * @param {boolean} showHidden — true on detail panel
 */
function renderTraits(monster, showHidden) {
  const ph = monster.phenotype;
  const genotype = monster.genotype;
  const discovered = getDiscoveredLoci(monster.uid);

  const loci = showHidden ? ALL_LOCI : VISIBLE_LOCI;
  const traitIcons = {
    A: { icon: '📡', label: 'Antennae' },
    B: { icon: '🪶', label: 'Wings' },
    C: { icon: '🦿', label: 'Legs' },
    D: { icon: '⚡', label: 'Stinger' },
    E: { icon: '🦷', label: 'Horns' },
    F: { icon: '🛡', label: 'Carapace' },
    G: { icon: '💨', label: 'Wingspan' },
  };

  let html = '<div class="traits-row">';
  for (const locus of loci) {
    const hidden = HIDDEN_LOCI.includes(locus);
    if (hidden && !showHidden) continue;

    const isDom = ph[locus] === 'dominant';
    const isHet = isHeterozygous(genotype, locus);
    const revealed = !hidden || discovered.includes(locus) || showHidden;

    if (hidden && !revealed) {
      html += `<div class="trait-pill unknown" title="Unknown hidden trait">
        <span class="trait-icon">?</span>
        <span class="trait-label">???</span>
      </div>`;
      continue;
    }

    const traitInfo = LOCUS_TRAITS[locus];
    const icon = traitIcons[locus] ? traitIcons[locus].icon : '•';
    const label = traitIcons[locus] ? traitIcons[locus].label : locus;
    const stateClass = isDom ? (isHet ? 'het' : 'dom') : 'rec';
    const titleText = isDom ? traitInfo.dominant : traitInfo.recessive;

    html += `<div class="trait-pill ${stateClass}" title="${titleText}">
      <span class="trait-icon">${icon}</span>
      <span class="trait-label">${label}</span>
    </div>`;
  }
  html += '</div>';
  return html;
}

/**
 * Render a compact monster card.
 */
function renderMonsterCard(monster, clickable) {
  const sp = SPECIES[monster.speciesId];
  const name = monsterName(monster);
  const domCount = dominantCount(monster);
  const clickAttr = clickable ? `data-uid="${monster.uid}" role="button" tabindex="0"` : '';
  const genTag = monster.generation > 0 ? `<span class="gen-badge">Gen ${monster.generation}</span>` : '';

  return `<div class="monster-card" ${clickAttr} style="--species-color:${sp.color}">
    <div class="card-header">
      <span class="mon-emoji">${sp.emoji}</span>
      <span class="mon-name">${name}</span>
      <span class="mon-level">Lv.${monster.level}</span>
      ${genTag}
    </div>
    <div class="type-badge type-${sp.type.toLowerCase()}">${sp.type}</div>
    ${renderHPBar(monster.currentHp, monster.stats.maxHp)}
    ${renderTraits(monster, false)}
    <div class="dom-score">Dominant: ${domCount}/7</div>
  </div>`;
}

/**
 * Render a full detail panel for a monster.
 */
function renderMonsterDetail(monster) {
  const sp = SPECIES[monster.speciesId];
  const name = monsterName(monster);

  const statsHtml = ['maxHp','atk','def','spd'].map(s => {
    const labels = { maxHp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' };
    return `<div class="stat-row"><span>${labels[s]}</span><span class="stat-val">${monster.stats[s]}</span></div>`;
  }).join('');

  const movesHtml = monster.moves.map(id => {
    const m = MOVES[id];
    if (!m) return '';
    return `<div class="move-tag type-${m.type.toLowerCase()}">${m.name} <span class="move-power">${m.power > 0 ? m.power : 'Status'}</span></div>`;
  }).join('');

  const parentInfo = monster.parents.some(p => p)
    ? `<div class="parent-info">Bred from 2 parents • Gen ${monster.generation}</div>`
    : `<div class="parent-info">Wild-caught at ${monster.caughtAt || 'Unknown'}</div>`;

  return `<div class="monster-detail">
    <div class="detail-header" style="background:${sp.color}22; border-left: 4px solid ${sp.color}">
      <span class="detail-emoji">${sp.emoji}</span>
      <div>
        <div class="detail-name">${name}</div>
        <div class="detail-species">${sp.name} &nbsp;•&nbsp; <span class="type-badge type-${sp.type.toLowerCase()}">${sp.type}</span></div>
        <div class="detail-desc">${sp.description}</div>
      </div>
    </div>
    <div class="detail-level">Level ${monster.level} &nbsp;•&nbsp; XP: ${monster.xp}/${monster.xpToNext}</div>
    <div class="section-label">Stats</div>
    <div class="stats-grid">${statsHtml}</div>
    <div class="section-label">Physical Traits <span class="hint">(hover for details)</span></div>
    ${renderTraits(monster, true)}
    <div class="section-label">Moves</div>
    <div class="moves-list">${movesHtml}</div>
    ${parentInfo}
  </div>`;
}

/**
 * Show a temporary toast notification.
 */
function showToast(message, type) {
  type = type || 'info';
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Render inventory summary.
 */
function renderInventory() {
  const inv = GameState.inventory;
  return `<div class="inventory-bar">
    <span title="Basic Net">🕸 ${inv.basicNets}</span>
    <span title="Fine Net">🥅 ${inv.fineNets}</span>
    <span title="Silk Net">✨🕸 ${inv.silkNets}</span>
    <span title="Glass Jars">🫙 ${inv.glassJars}</span>
  </div>`;
}
