// screen-hub.js — Central hub / main menu

'use strict';

// Pre-scripted rival encounters
const RIVALS = {
  RIVAL_1: {
    id: 'RIVAL_1',
    name: 'Keg',
    intro: '"You think those bugs can beat mine? Let\'s find out."',
    team: null, // built lazily
    unlockArea: 'SHOCKPEAKS',
    flagKey: 'rivalDefeated1',
    requiredMonsters: 3,
    rewardNets: { fineNets: 5 },
  },
  RIVAL_2: {
    id: 'RIVAL_2',
    name: 'Keg',
    intro: '"You\'ve gotten stronger. But so have I."',
    team: null,
    unlockArea: 'VOIDRIFT',
    flagKey: 'rivalDefeated2',
    requiredMonsters: 5,
    rewardNets: { silkNets: 3 },
  },
};

function buildRivalTeam(rivalId) {
  if (rivalId === 'RIVAL_1') {
    return [
      createMonster('BRAMBLESTICK', 8, {
        A: ['D','R'], B: ['R','R'], C: ['D','D'], D: ['D','R'], E: ['R','R'], F: ['R','R'], G: ['R','R']
      }),
    ];
  } else if (rivalId === 'RIVAL_2') {
    return [
      createMonster('ZAPPFLY', 15, {
        A: ['D','D'], B: ['D','R'], C: ['R','R'], D: ['D','R'], E: ['R','R'], F: ['R','R'], G: ['D','R']
      }),
      createMonster('CRUSTWALL', 14, {
        A: ['R','R'], B: ['R','R'], C: ['D','D'], D: ['R','R'], E: ['D','D'], F: ['D','R'], G: ['R','R']
      }),
    ];
  }
  return [];
}

GameBus.on('screen:hub:enter', function () {
  const el = document.getElementById('screen-hub');
  const stable = GameState.stable;

  const rivalButtons = _buildRivalButtons();

  el.innerHTML = `
    <div class="hub-screen">
      <div class="hub-header">
        <h2>🫙 ${GameState.playerName}'s Collection</h2>
        ${renderInventory()}
      </div>
      <div class="hub-stats">
        <span>🐛 Bugs: ${stable.length}/30</span>
        <span>🔬 Breeds: ${GameState.stats.totalBreeds}</span>
        <span>⚔️ Battles: ${GameState.stats.totalBattles}</span>
        <span>🏆 Best Gen: ${GameState.stats.highestGeneration}</span>
      </div>
      <div class="hub-nav">
        <button id="hub-explore" class="hub-btn">
          <span class="hub-btn-icon">🌿</span>
          <span class="hub-btn-label">Explore</span>
          <span class="hub-btn-desc">Catch wild bugs</span>
        </button>
        <button id="hub-stable" class="hub-btn">
          <span class="hub-btn-icon">🫙</span>
          <span class="hub-btn-label">Jar Collection</span>
          <span class="hub-btn-desc">View your bugs</span>
        </button>
        <button id="hub-breed" class="hub-btn" ${stable.length < 2 ? 'disabled title="Need at least 2 bugs"' : ''}>
          <span class="hub-btn-icon">🧬</span>
          <span class="hub-btn-label">Breed Lab</span>
          <span class="hub-btn-desc">Combine traits</span>
        </button>
      </div>
      ${rivalButtons}
    </div>
  `;

  document.getElementById('hub-explore').addEventListener('click', () => navigateTo('explore'));
  document.getElementById('hub-stable').addEventListener('click', () => navigateTo('stable'));
  if (stable.length >= 2) {
    document.getElementById('hub-breed').addEventListener('click', () => navigateTo('breed'));
  }

  // Wire rival buttons
  for (const rivalId of Object.keys(RIVALS)) {
    const btn = document.getElementById(`rival-btn-${rivalId}`);
    if (btn) {
      btn.addEventListener('click', () => _startRivalBattle(rivalId));
    }
  }
});

function _buildRivalButtons() {
  let html = '';
  for (const [rivalId, rival] of Object.entries(RIVALS)) {
    const defeated = GameState.defeatedTrainers.includes(rivalId);
    const available = GameState.stable.length >= rival.requiredMonsters && !defeated;
    if (!available && !defeated) {
      html += `<div class="rival-locked">⚔️ Rival "${rival.name}" — needs ${rival.requiredMonsters} bugs</div>`;
      continue;
    }
    if (defeated) {
      html += `<div class="rival-defeated">✅ Rival "${rival.name}" defeated</div>`;
      continue;
    }
    html += `<button id="rival-btn-${rivalId}" class="btn btn-rival">
      ⚔️ Challenge Rival ${rival.name}
    </button>`;
  }
  return html ? `<div class="rival-section">${html}</div>` : '';
}

function _startRivalBattle(rivalId) {
  const rival = RIVALS[rivalId];
  if (!rival) return;
  if (GameState.stable.length === 0) {
    showToast('You need at least one bug!', 'error');
    return;
  }

  rival.team = buildRivalTeam(rivalId);

  // Pick player's healthiest bug
  const playerMon = GameState.stable.slice().sort((a, b) => b.currentHp - a.currentHp)[0];
  if (!playerMon || playerMon.currentHp <= 0) {
    showToast('All your bugs have fainted! Rest them first.', 'error');
    return;
  }

  showToast(`Rival ${rival.name}: ${rival.intro}`, 'info');

  setTimeout(() => {
    navigateTo('battle', {
      playerMonsterUid: playerMon.uid,
      enemyMonster: rival.team[0],
      battleType: 'trainer',
      trainerId: rivalId,
      trainerName: rival.name,
      onWin: () => {
        recordTrainerDefeat(rivalId);
        setFlag(rival.flagKey);

        // Award nets
        if (rival.rewardNets) {
          for (const [key, val] of Object.entries(rival.rewardNets)) {
            GameState.inventory[key] = (GameState.inventory[key] || 0) + val;
          }
          saveState();
        }

        // Unlock area
        const newAreas = updateAreaUnlocks(GameState);
        if (newAreas.length) {
          showToast(`New area unlocked: ${AREAS[newAreas[0]].name}!`, 'success');
        }
        showToast(`You defeated ${rival.name}!`, 'success');
      },
    });
  }, 800);
}
