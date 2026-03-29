// state.js — Game state singleton and localStorage persistence

'use strict';

const SAVE_KEY = 'bug_game_save';
const STATE_VERSION = 1;

const DEFAULT_STATE = {
  version: STATE_VERSION,
  playerName: 'Collector',
  inventory: {
    basicNets: 10,
    fineNets: 0,
    silkNets: 0,
    glassJars: 20,
  },
  stable: [],        // array of monster objects, max 30
  unlockedAreas: ['ASHFIELD'],
  defeatedTrainers: [],
  discoveredHiddenLoci: {}, // { [monsterUid]: ['F', 'G', ...] }
  flags: {
    tutorialComplete: false,
    rivalDefeated1: false,
    rivalDefeated2: false,
    lumibeetleSeen: false,
    gameComplete: false,
  },
  stats: {
    totalBattles: 0,
    totalCatches: 0,
    totalBreeds: 0,
    highestGeneration: 0,
  },
};

// Live game state (mutated directly)
let GameState = null;

function newGame(playerName) {
  GameState = deepClone(DEFAULT_STATE);
  GameState.playerName = playerName || 'Collector';
  saveState();
  return GameState;
}

function saveState() {
  if (!GameState) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(GameState));
}

function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    // Basic migration: fill in any missing keys from DEFAULT_STATE
    GameState = Object.assign({}, deepClone(DEFAULT_STATE), saved);
    // Deep-merge inventory and flags
    GameState.inventory = Object.assign({}, DEFAULT_STATE.inventory, saved.inventory);
    GameState.flags = Object.assign({}, DEFAULT_STATE.flags, saved.flags);
    GameState.stats = Object.assign({}, DEFAULT_STATE.stats, saved.stats);
    return GameState;
  } catch (e) {
    console.error('Failed to load save:', e);
    return null;
  }
}

function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
  GameState = null;
}

// ── Inventory helpers ────────────────────────────────────────────────────────

function netTypeAvailable(netType) {
  const key = netType; // 'basicNets', 'fineNets', 'silkNets'
  return GameState && (GameState.inventory[key] || 0) > 0;
}

function hasGlassJar() {
  return GameState && GameState.inventory.glassJars > 0;
}

function useNet(netType) {
  if (!GameState) return false;
  const key = netType;
  if (!GameState.inventory[key] || GameState.inventory[key] <= 0) return false;
  GameState.inventory[key] -= 1;
  GameState.inventory.glassJars = Math.max(0, GameState.inventory.glassJars - 1);
  saveState();
  return true;
}

// ── Stable helpers ───────────────────────────────────────────────────────────

function addToStable(monster) {
  if (!GameState) return false;
  if (GameState.stable.length >= 30) return false;
  monster.caughtAt = monster.caughtAt || 'Unknown';
  GameState.stable.push(monster);
  GameState.stats.totalCatches += 1;
  if (monster.generation > GameState.stats.highestGeneration) {
    GameState.stats.highestGeneration = monster.generation;
  }
  saveState();
  return true;
}

function removeFromStable(uid) {
  if (!GameState) return;
  GameState.stable = GameState.stable.filter(m => m.uid !== uid);
  saveState();
}

function getMonster(uid) {
  if (!GameState) return null;
  return GameState.stable.find(m => m.uid === uid) || null;
}

function updateMonster(updatedMonster) {
  if (!GameState) return;
  const idx = GameState.stable.findIndex(m => m.uid === updatedMonster.uid);
  if (idx !== -1) {
    GameState.stable[idx] = updatedMonster;
    saveState();
  }
}

// ── Flag helpers ─────────────────────────────────────────────────────────────

function setFlag(key, value) {
  if (!GameState) return;
  GameState.flags[key] = value !== undefined ? value : true;
  saveState();
}

function getFlag(key) {
  return GameState ? !!GameState.flags[key] : false;
}

// ── Defeat trainer ───────────────────────────────────────────────────────────

function recordTrainerDefeat(trainerId) {
  if (!GameState) return;
  if (!GameState.defeatedTrainers.includes(trainerId)) {
    GameState.defeatedTrainers.push(trainerId);
  }
  GameState.stats.totalBattles += 1;
  saveState();
}

// ── Hidden loci discovery ────────────────────────────────────────────────────

function discoverHiddenLocus(monsterUid, locus) {
  if (!GameState) return;
  if (!GameState.discoveredHiddenLoci[monsterUid]) {
    GameState.discoveredHiddenLoci[monsterUid] = [];
  }
  if (!GameState.discoveredHiddenLoci[monsterUid].includes(locus)) {
    GameState.discoveredHiddenLoci[monsterUid].push(locus);
    saveState();
    return true; // newly discovered
  }
  return false;
}

function getDiscoveredLoci(monsterUid) {
  return (GameState && GameState.discoveredHiddenLoci[monsterUid]) || [];
}

// ── Post-battle handler ──────────────────────────────────────────────────────

/**
 * Apply battle results to game state.
 * @param {Object} battleState — final state from executeTurn
 * @param {string} originalPlayerMonsterUid
 */
function applyBattleResult(battleState, originalPlayerMonsterUid) {
  if (!GameState) return { messages: [] };
  const messages = [];

  GameState.stats.totalBattles += 1;

  if (battleState.winner === 'player' && !battleState.caught) {
    // No XP from battles — bugs level up through breeding only
    const playerMon = getMonster(originalPlayerMonsterUid);
    if (playerMon) {
      playerMon.currentHp = battleState.playerMonster.currentHp;
      updateMonster(playerMon);
    }
  }

  if (battleState.winner === 'enemy') {
    // Heal fainted monster to 1 HP (no full heal system for now)
    const playerMon = getMonster(originalPlayerMonsterUid);
    if (playerMon) {
      playerMon.currentHp = 1;
      updateMonster(playerMon);
    }
  }

  if (battleState.caught && battleState.caughtMonster) {
    const caught = battleState.caughtMonster;
    const sp = SPECIES[caught.speciesId];
    addToStable(caught);
    messages.push(`${sp.name} was added to your jar collection!`);
    // Check for hidden locus discovery
    for (const locus of HIDDEN_LOCI) {
      if (caught.phenotype[locus] === 'dominant') {
        const isNew = discoverHiddenLocus(caught.uid, locus);
        if (isNew) {
          messages.push(`Discovered hidden trait: ${LOCUS_TRAITS[locus].name}!`);
        }
      }
    }
  }

  // Check area unlocks
  const newAreas = updateAreaUnlocks(GameState);
  for (const areaId of newAreas) {
    messages.push(`New area unlocked: ${AREAS[areaId].name}!`);
  }

  saveState();
  return { messages };
}

// ── Breed result handler ─────────────────────────────────────────────────────

function applyBreedResult(offspring, mutations) {
  if (!GameState) return { messages: [] };
  const messages = [];

  const sp = SPECIES[offspring.speciesId];
  offspring.caughtAt = 'Breed Lab';

  if (!addToStable(offspring)) {
    return { messages: ['Your jar collection is full (max 30)!'] };
  }

  GameState.stats.totalBreeds += 1;
  if (offspring.generation > GameState.stats.highestGeneration) {
    GameState.stats.highestGeneration = offspring.generation;
  }

  messages.push(`A new ${sp.name} hatched! (Gen ${offspring.generation})`);

  if (mutations.length > 0) {
    const traitNames = mutations.map(l => LOCUS_TRAITS[l].name);
    messages.push(`Mutation! ${traitNames.join(', ')} changed!`);
  }

  // Discover hidden loci if expressed
  for (const locus of HIDDEN_LOCI) {
    if (offspring.phenotype[locus] === 'dominant') {
      const isNew = discoverHiddenLocus(offspring.uid, locus);
      if (isNew) {
        messages.push(`Discovered hidden trait: ${LOCUS_TRAITS[locus].name}!`);
      }
    }
  }

  // Check area unlocks
  const newAreas = updateAreaUnlocks(GameState);
  for (const areaId of newAreas) {
    messages.push(`New area unlocked: ${AREAS[areaId].name}!`);
  }

  saveState();
  return { messages };
}
