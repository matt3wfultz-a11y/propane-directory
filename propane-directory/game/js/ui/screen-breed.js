// screen-breed.js — Breeding lab

'use strict';

let _breedSelected = [null, null]; // [monsterUid, monsterUid]

GameBus.on('screen:breed:enter', function () {
  _breedSelected = [null, null];
  _renderBreedLab();
});

function _renderBreedLab() {
  const el = document.getElementById('screen-breed');
  const stable = GameState.stable;

  // Group by species for filtering
  const speciesFilter = [...new Set(stable.map(m => m.speciesId))];

  el.innerHTML = `
    <div class="breed-screen">
      <div class="screen-header">
        <button class="btn btn-back" id="btn-back-hub">← Hub</button>
        <h2>🧬 Breed Lab</h2>
      </div>
      <p class="breed-hint">Select two bugs of the same species to breed them.</p>

      <div class="breed-slots">
        <div class="breed-slot" id="slot-a">
          <div class="slot-label">Parent A</div>
          <div class="slot-content" id="slot-a-content">
            <span class="slot-empty">Pick a bug ↓</span>
          </div>
        </div>
        <div class="breed-slot" id="slot-b">
          <div class="slot-label">Parent B</div>
          <div class="slot-content" id="slot-b-content">
            <span class="slot-empty">Pick a bug ↓</span>
          </div>
        </div>
      </div>

      <div id="punnett-preview" class="punnett-preview hidden"></div>

      <div class="breed-controls">
        <button id="btn-breed" class="btn btn-primary btn-large" disabled>🧬 Breed!</button>
      </div>

      <div class="breed-picker">
        <div class="section-label">Your Bugs</div>
        <div class="monster-grid" id="breed-picker-grid">
          ${stable.map(m => renderMonsterCard(m, true)).join('')}
        </div>
      </div>

      <div id="breed-result" class="breed-result hidden"></div>
    </div>
  `;

  document.getElementById('btn-back-hub').addEventListener('click', () => navigateTo('hub'));
  document.getElementById('btn-breed').addEventListener('click', _doBreed);

  document.querySelectorAll('#breed-picker-grid .monster-card[data-uid]').forEach(card => {
    card.addEventListener('click', () => _selectForBreeding(card.dataset.uid));
  });
}

function _selectForBreeding(uid) {
  // If already selected, deselect
  if (_breedSelected[0] === uid) {
    _breedSelected[0] = null;
  } else if (_breedSelected[1] === uid) {
    _breedSelected[1] = null;
  } else if (_breedSelected[0] === null) {
    _breedSelected[0] = uid;
  } else if (_breedSelected[1] === null) {
    _breedSelected[1] = uid;
  } else {
    // Replace slot A
    _breedSelected[0] = uid;
  }
  _updateBreedSlots();
}

function _updateBreedSlots() {
  const [uidA, uidB] = _breedSelected;
  const monA = uidA ? getMonster(uidA) : null;
  const monB = uidB ? getMonster(uidB) : null;

  const slotA = document.getElementById('slot-a-content');
  const slotB = document.getElementById('slot-b-content');

  slotA.innerHTML = monA
    ? `<div class="slot-mon">${SPECIES[monA.speciesId].emoji} ${monsterName(monA)} Lv.${monA.level}</div>
       ${renderTraits(monA, false)}`
    : '<span class="slot-empty">Pick a bug ↓</span>';

  slotB.innerHTML = monB
    ? `<div class="slot-mon">${SPECIES[monB.speciesId].emoji} ${monsterName(monB)} Lv.${monB.level}</div>
       ${renderTraits(monB, false)}`
    : '<span class="slot-empty">Pick a bug ↓</span>';

  // Highlight selected cards
  document.querySelectorAll('#breed-picker-grid .monster-card').forEach(c => {
    c.classList.remove('selected-a', 'selected-b');
    if (c.dataset.uid === uidA) c.classList.add('selected-a');
    if (c.dataset.uid === uidB) c.classList.add('selected-b');
  });

  const breedBtn = document.getElementById('btn-breed');
  const punnettEl = document.getElementById('punnett-preview');

  if (monA && monB) {
    if (monA.speciesId !== monB.speciesId) {
      breedBtn.disabled = true;
      punnettEl.classList.add('hidden');
      showToast('Bugs must be the same species to breed.', 'error');
      return;
    }
    if (monA.uid === monB.uid) {
      breedBtn.disabled = true;
      punnettEl.classList.add('hidden');
      showToast('A bug cannot breed with itself.', 'error');
      return;
    }
    breedBtn.disabled = false;
    _showPunnettPreview(monA, monB);
  } else {
    breedBtn.disabled = true;
    punnettEl.classList.add('hidden');
  }
}

function _showPunnettPreview(monA, monB) {
  const punnettEl = document.getElementById('punnett-preview');
  const probs = punnettProbabilities(monA, monB);

  const rows = VISIBLE_LOCI.map(locus => {
    const p = probs[locus];
    const traitInfo = LOCUS_TRAITS[locus];
    const pct = Math.round(p.pDominant * 100);
    const barColor = pct > 66 ? '#4caf50' : pct > 33 ? '#ff9800' : '#f44336';
    return `<div class="punnett-row">
      <span class="punnett-trait">${traitInfo.name}</span>
      <div class="punnett-bar-wrap">
        <div class="punnett-bar" style="width:${pct}%; background:${barColor}"></div>
      </div>
      <span class="punnett-pct">${pct}% dominant</span>
    </div>`;
  }).join('');

  punnettEl.classList.remove('hidden');
  punnettEl.innerHTML = `
    <div class="section-label">Trait Inheritance Odds</div>
    <div class="punnett-grid">${rows}</div>
    <div class="punnett-note">Hidden traits (Carapace, Wingspan) not shown — discover them through breeding!</div>
  `;
}

function _doBreed() {
  const [uidA, uidB] = _breedSelected;
  if (!uidA || !uidB) return;

  const monA = getMonster(uidA);
  const monB = getMonster(uidB);
  if (!monA || !monB) return;
  if (monA.speciesId !== monB.speciesId || monA.uid === monB.uid) return;

  const { offspring, mutations } = breedMonsters(monA, monB);

  // Increment breed counts on parents
  monA.breedCount = (monA.breedCount || 0) + 1;
  monB.breedCount = (monB.breedCount || 0) + 1;
  updateMonster(monA);
  updateMonster(monB);

  const result = applyBreedResult(offspring, mutations);

  _showBreedResult(offspring, mutations, result.messages);
}

function _showBreedResult(offspring, mutations, messages) {
  const resultEl = document.getElementById('breed-result');
  resultEl.classList.remove('hidden');

  const sp = SPECIES[offspring.speciesId];
  const mutationHtml = mutations.length > 0
    ? `<div class="mutation-alert">⚡ Mutation! ${mutations.map(l => LOCUS_TRAITS[l].name).join(', ')} changed!</div>`
    : '';

  resultEl.innerHTML = `
    <div class="section-label">New Offspring!</div>
    ${mutationHtml}
    <div class="breed-offspring">
      <div class="offspring-header">
        <span class="offspring-emoji">${sp.emoji}</span>
        <div>
          <div class="offspring-name">${sp.name}</div>
          <div class="offspring-gen">Generation ${offspring.generation}</div>
        </div>
      </div>
      ${renderTraits(offspring, false)}
      <div class="offspring-stats">
        HP: ${offspring.stats.maxHp} &nbsp; ATK: ${offspring.stats.atk} &nbsp;
        DEF: ${offspring.stats.def} &nbsp; SPD: ${offspring.stats.spd}
      </div>
      ${messages.map(m => `<div class="breed-msg">${m}</div>`).join('')}
    </div>
    <button id="btn-breed-again" class="btn btn-secondary">Breed Again</button>
    <button id="btn-view-offspring" class="btn btn-primary">View in Collection</button>
  `;

  resultEl.scrollIntoView({ behavior: 'smooth' });

  document.getElementById('btn-breed-again').addEventListener('click', () => {
    _breedSelected = [null, null];
    GameBus.emit('screen:breed:enter');
  });

  document.getElementById('btn-view-offspring').addEventListener('click', () => navigateTo('stable'));
}
