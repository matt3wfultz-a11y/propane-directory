// catch.js — Exploration and catching system

'use strict';

const NET_BONUSES = {
  basicNet: 1.0,
  fineNet:  1.5,
  silkNet:  2.0,
};

/**
 * Roll for a wild encounter in the given area.
 * Returns a monster object if encounter occurs, null otherwise.
 * @param {string} areaId
 */
function rollEncounter(areaId) {
  const area = AREAS[areaId];
  if (!area) return null;

  // Pick species by weight
  const speciesId = weightedRandom(
    area.encounterTable.map(e => ({ value: e.speciesId, weight: e.weight }))
  );

  // Pick level from range
  const entry = area.encounterTable.find(e => e.speciesId === speciesId);
  const level = randInt(entry.levelRange[0], entry.levelRange[1]);

  const monster = createMonster(speciesId, level);
  monster.caughtAt = area.name;
  return monster;
}

/**
 * Attempt to catch a wild monster.
 * @param {Object} wildMonster
 * @param {string} netType — 'basicNet' | 'fineNet' | 'silkNet'
 * @returns {{ success: boolean, catchRate: number, shakes: number }}
 */
function attemptCatch(wildMonster, netType) {
  const sp = SPECIES[wildMonster.speciesId];
  const netBonus = NET_BONUSES[netType] || 1.0;
  const weakenedBonus = wildMonster.currentHp <= wildMonster.stats.maxHp * 0.25 ? 1.5 : 1.0;

  const catchRate = Math.min(
    0.99,
    ((3 * wildMonster.stats.maxHp - 2 * wildMonster.currentHp) / (3 * wildMonster.stats.maxHp))
    * sp.baseCatchRate
    * netBonus
    * weakenedBonus
  );

  const success = Math.random() < catchRate;

  // Shake count for animation (0–3): simulates ball shaking
  let shakes = 0;
  for (let i = 0; i < 3; i++) {
    if (Math.random() < catchRate) shakes++;
    else break;
  }
  if (success) shakes = 3;

  return { success, catchRate, shakes };
}

/**
 * Check whether an area should be unlocked given current game state.
 */
function checkAreaUnlock(areaId, gameState) {
  const area = AREAS[areaId];
  if (!area || area.unlocked) return false;
  const cond = area.unlockCondition;
  if (!cond) return false;

  const stable = gameState.stable;

  if (cond.monstersOwned !== undefined && stable.length < cond.monstersOwned) return false;
  if (cond.defeatedTrainer && !gameState.defeatedTrainers.includes(cond.defeatedTrainer)) return false;
  if (cond.minGeneration !== undefined) {
    const maxGen = stable.reduce((m, bug) => Math.max(m, bug.generation || 0), 0);
    if (maxGen < cond.minGeneration) return false;
  }
  if (cond.minDominantLoci !== undefined) {
    const best = stable.reduce((m, bug) => Math.max(m, countDominantLoci(bug)), 0);
    if (best < cond.minDominantLoci) return false;
  }
  return true;
}

/**
 * Get list of currently accessible areas.
 */
function getUnlockedAreas(gameState) {
  return Object.values(AREAS).filter(a => gameState.unlockedAreas.includes(a.id));
}

/**
 * Try to unlock any newly eligible areas and update gameState.unlockedAreas.
 * Returns array of newly unlocked area IDs.
 */
function updateAreaUnlocks(gameState) {
  const newlyUnlocked = [];
  for (const areaId of Object.keys(AREAS)) {
    if (!gameState.unlockedAreas.includes(areaId) && checkAreaUnlock(areaId, gameState)) {
      gameState.unlockedAreas.push(areaId);
      newlyUnlocked.push(areaId);
    }
  }
  return newlyUnlocked;
}
