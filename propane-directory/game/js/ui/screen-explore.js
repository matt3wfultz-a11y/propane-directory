// screen-explore.js — Area exploration and encounter screen

'use strict';

let _exploreState = null;

GameBus.on('screen:explore:enter', function () {
  _exploreState = {
    areaId: null,
    stepCount: 0,
    nextEncounterAt: 0,
  };
  _renderAreaSelect();
});

function _renderAreaSelect() {
  const el = document.getElementById('screen-explore');
  const areas = getUnlockedAreas(GameState);

  const areaCards = areas.map(area => {
    const speciesNames = area.encounterTable.map(e => SPECIES[e.speciesId].name).join(', ');
    return `<div class="area-card" data-area="${area.id}">
      <div class="area-name">${area.name}</div>
      <div class="area-desc">${area.description}</div>
      <div class="area-bugs">Bugs: ${speciesNames}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="explore-screen">
      <div class="screen-header">
        <button class="btn btn-back" id="btn-back-hub">← Back</button>
        <h2>🌿 Explore</h2>
      </div>
      <p class="explore-hint">Choose an area to search for wild bugs.</p>
      <div class="area-grid">${areaCards}</div>
    </div>
  `;

  document.getElementById('btn-back-hub').addEventListener('click', () => navigateTo('hub'));

  document.querySelectorAll('.area-card').forEach(card => {
    card.addEventListener('click', () => {
      _exploreState.areaId = card.dataset.area;
      _exploreState.stepCount = 0;
      _exploreState.nextEncounterAt = randInt(
        AREAS[_exploreState.areaId].stepsRange[0],
        AREAS[_exploreState.areaId].stepsRange[1]
      );
      _renderExploring();
    });
  });
}

function _renderExploring() {
  const el = document.getElementById('screen-explore');
  const area = AREAS[_exploreState.areaId];

  el.innerHTML = `
    <div class="explore-screen">
      <div class="screen-header">
        <button class="btn btn-back" id="btn-back-areas">← Areas</button>
        <h2>🌿 ${area.name}</h2>
      </div>
      ${renderInventory()}
      <div class="explore-area-desc">${area.description}</div>
      <div class="explore-step-zone">
        <div class="step-count">Steps: <span id="step-count">${_exploreState.stepCount}</span></div>
        <div class="step-hint" id="step-hint">Rustle through the undergrowth...</div>
      </div>
      <div class="explore-actions">
        <button id="btn-step" class="btn btn-primary btn-large">Take a Step 👣</button>
      </div>
    </div>
  `;

  document.getElementById('btn-back-areas').addEventListener('click', _renderAreaSelect);

  document.getElementById('btn-step').addEventListener('click', () => {
    _exploreState.stepCount += 1;
    document.getElementById('step-count').textContent = _exploreState.stepCount;

    if (_exploreState.stepCount >= _exploreState.nextEncounterAt) {
      // Trigger encounter!
      const wildBug = rollEncounter(_exploreState.areaId);
      if (wildBug) {
        _triggerEncounter(wildBug);
      }
    } else {
      const remaining = _exploreState.nextEncounterAt - _exploreState.stepCount;
      const hints = [
        'Leaves rustle in the distance...',
        'Something scurries through the grass.',
        'A faint buzz in the air.',
        'The undergrowth trembles.',
        'You sense movement nearby...',
      ];
      document.getElementById('step-hint').textContent =
        remaining <= 2 ? '⚠️ Something is very close!' : pickRandom(hints);
    }
  });
}

function _triggerEncounter(wildBug) {
  const sp = SPECIES[wildBug.speciesId];

  if (GameState.stable.length === 0) {
    showToast('You need a bug to battle with!', 'error');
    return;
  }

  // Pick player's highest HP bug
  const playerMon = GameState.stable.slice().sort((a, b) => b.currentHp - a.currentHp)[0];
  if (!playerMon || playerMon.currentHp <= 0) {
    showToast('All your bugs have fainted! Rest them at the hub.', 'error');
    return;
  }

  showToast(`A wild ${sp.name} appeared!`, 'info');

  // Reset step counter for next encounter
  _exploreState.stepCount = 0;
  _exploreState.nextEncounterAt = randInt(
    AREAS[_exploreState.areaId].stepsRange[0],
    AREAS[_exploreState.areaId].stepsRange[1]
  );

  setTimeout(() => {
    navigateTo('battle', {
      playerMonsterUid: playerMon.uid,
      enemyMonster: wildBug,
      battleType: 'wild',
      returnToExplore: true,
      areaId: _exploreState.areaId,
    });
  }, 500);
}
