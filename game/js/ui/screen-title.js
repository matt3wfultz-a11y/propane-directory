// screen-title.js — Title / new game / load game screen

'use strict';

// Starter bug options — fixed genotypes so each feels distinct
const STARTERS = [
  {
    speciesId: 'SCORCHMITE',
    label: 'The Striker',
    tagline: 'Fast and aggressive. Hits hard with antennae and stinger.',
    genotype: { A: ['D','D'], B: ['D','R'], C: ['R','R'], D: ['D','D'], E: ['R','R'], F: ['R','R'], G: ['R','R'] },
  },
  {
    speciesId: 'BOGSLOG',
    label: 'The Wall',
    tagline: 'Slow but nearly unbreakable. Horns and legs make it a fortress.',
    genotype: { A: ['R','R'], B: ['R','R'], C: ['D','D'], D: ['R','R'], E: ['D','D'], F: ['D','R'], G: ['R','R'] },
  },
  {
    speciesId: 'BRAMBLESTICK',
    label: 'The Trickster',
    tagline: 'Balanced and venomous. Stinger and wings give it an edge.',
    genotype: { A: ['D','R'], B: ['D','D'], C: ['D','R'], D: ['D','D'], E: ['R','R'], F: ['R','R'], G: ['R','R'] },
  },
];

GameBus.on('screen:title:enter', function () {
  const el = document.getElementById('screen-title');
  const hasSaveGame = hasSave();

  el.innerHTML = `
    <div class="title-screen">
      <div class="title-logo">
        <div class="title-bugs">🪲 🦋 🦗 🐛 ✨</div>
        <h1 class="game-title">BugJar</h1>
        <p class="game-subtitle">Catch • Breed • Battle</p>
      </div>
      <div class="title-buttons">
        ${hasSaveGame
          ? `<button id="btn-continue" class="btn btn-primary">Continue</button>`
          : ''}
        <button id="btn-new-game" class="btn ${hasSaveGame ? 'btn-secondary' : 'btn-primary'}">New Game</button>
      </div>
      ${hasSaveGame
        ? `<button id="btn-delete-save" class="btn btn-danger btn-sm">Delete Save</button>`
        : ''}
    </div>
  `;

  if (hasSaveGame) {
    document.getElementById('btn-continue').addEventListener('click', () => {
      if (loadState()) navigateTo('hub');
    });
    document.getElementById('btn-delete-save').addEventListener('click', () => {
      if (confirm('Delete your save? This cannot be undone.')) {
        deleteSave();
        GameBus.emit('screen:title:enter');
      }
    });
  }

  document.getElementById('btn-new-game').addEventListener('click', () => {
    if (hasSaveGame && !confirm('Start a new game? Your current save will be overwritten.')) return;
    _showNameInput();
  });
});

function _showNameInput() {
  const el = document.getElementById('screen-title');
  el.innerHTML = `
    <div class="title-screen">
      <div class="title-logo">
        <h1 class="game-title">BugJar</h1>
      </div>
      <div class="name-form">
        <label for="player-name-input">What's your name, Collector?</label>
        <input id="player-name-input" type="text" maxlength="16" placeholder="Enter name…" autocomplete="off" />
        <button id="btn-next" class="btn btn-primary">Next →</button>
      </div>
    </div>
  `;

  const input = document.getElementById('player-name-input');
  input.focus();

  document.getElementById('btn-next').addEventListener('click', () => {
    const name = input.value.trim() || 'Collector';
    _showStarterSelect(name);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-next').click();
  });
}

function _showStarterSelect(playerName) {
  const el = document.getElementById('screen-title');

  const cards = STARTERS.map((s, i) => {
    const sp = SPECIES[s.speciesId];
    const tempMonster = createMonster(s.speciesId, 5, s.genotype);
    const statsHtml = `HP ${tempMonster.stats.maxHp} · ATK ${tempMonster.stats.atk} · DEF ${tempMonster.stats.def} · SPD ${tempMonster.stats.spd}`;

    return `<div class="starter-card" data-index="${i}">
      <div class="starter-emoji">${sp.emoji}</div>
      <div class="starter-label">${s.label}</div>
      <div class="starter-name">${sp.name}</div>
      <div class="type-badge type-${sp.type.toLowerCase()}">${sp.type}</div>
      <div class="starter-tagline">${s.tagline}</div>
      ${renderTraits(tempMonster, false)}
      <div class="starter-stats">${statsHtml}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="title-screen starter-screen">
      <div class="title-logo">
        <h1 class="game-title" style="font-size:32px">Choose your starter</h1>
        <p class="game-subtitle">Your first bug companion</p>
      </div>
      <div class="starter-grid">${cards}</div>
      <p class="starter-hint">Tap a bug to select it</p>
    </div>
  `;

  document.querySelectorAll('.starter-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.starter-card').forEach(c => c.classList.remove('starter-selected'));
      card.classList.add('starter-selected');

      const idx = parseInt(card.dataset.index);
      _confirmStarter(playerName, idx);
    });
  });
}

function _confirmStarter(playerName, idx) {
  const starter = STARTERS[idx];
  const sp = SPECIES[starter.speciesId];

  // Show confirm button below the selected card
  const existing = document.getElementById('starter-confirm');
  if (existing) existing.remove();

  const btn = document.createElement('button');
  btn.id = 'starter-confirm';
  btn.className = 'btn btn-primary btn-large';
  btn.textContent = `Start with ${sp.name}!`;
  btn.style.marginTop = '16px';

  document.querySelector('.starter-screen').appendChild(btn);

  btn.addEventListener('click', () => {
    newGame(playerName);

    // Create the starter at level 5 and add to stable
    const starterBug = createMonster(starter.speciesId, 5, starter.genotype);
    starterBug.caughtAt = 'Your Journey';
    addToStable(starterBug);

    navigateTo('hub');
  });
}
