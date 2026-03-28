// monster.js — Monster factory and leveling

'use strict';

const XP_BASE = 100; // xp needed at level 1→2; scales with level^1.5

function xpToNextLevel(level) {
  return Math.floor(XP_BASE * Math.pow(level, 1.5));
}

/**
 * Create a monster object.
 * @param {string} speciesId
 * @param {number} level
 * @param {Object} [genotypeOverride] — if omitted, generates random wild genotype
 */
function createMonster(speciesId, level, genotypeOverride) {
  const genotype = genotypeOverride || randomWildGenotype(speciesId);
  const phenotype = expressGenotype(genotype);
  const stats = computeStats(speciesId, level, genotype);

  const sp = SPECIES[speciesId];

  // Determine starting moves for level
  const moves = [];
  const sortedLevels = Object.keys(sp.learnAt).map(Number).sort((a, b) => a - b);
  for (const learnLevel of sortedLevels) {
    if (learnLevel <= level) {
      for (const moveId of sp.learnAt[learnLevel]) {
        if (moves.length < 4 && !moves.includes(moveId)) {
          // Only include STINGER if the bug has a stinger (phenotype D dominant)
          if (moveId === 'STINGER' && phenotype.D !== 'dominant') continue;
          moves.push(moveId);
        }
      }
    }
  }
  if (moves.length === 0) moves.push('TACKLE');

  return {
    uid: uid(),
    speciesId,
    nickname: null,
    level,
    xp: 0,
    xpToNext: xpToNextLevel(level),
    genotype,
    phenotype,
    stats,
    currentHp: stats.maxHp,
    moves,
    breedCount: 0,
    parents: [null, null],
    generation: 0,
    caughtAt: null,
    caughtLevel: level,
    dateObtained: Date.now(),
  };
}

/**
 * Apply XP to a monster. Returns array of level-up messages (may be empty).
 * Mutates the monster in place.
 */
function applyXP(monster, xpGained) {
  const messages = [];
  monster.xp += xpGained;
  while (monster.xp >= monster.xpToNext) {
    monster.xp -= monster.xpToNext;
    monster.level += 1;
    monster.xpToNext = xpToNextLevel(monster.level);

    // Recompute stats on level up
    const oldMaxHp = monster.stats.maxHp;
    monster.stats = computeStats(monster.speciesId, monster.level, monster.genotype);
    // Heal proportionally
    monster.currentHp = Math.round((monster.currentHp / oldMaxHp) * monster.stats.maxHp);

    messages.push(`${monster.nickname || SPECIES[monster.speciesId].name} grew to level ${monster.level}!`);

    // Check for new moves
    const sp = SPECIES[monster.speciesId];
    const newMoves = sp.learnAt[monster.level] || [];
    for (const moveId of newMoves) {
      if (moveId === 'STINGER' && monster.phenotype.D !== 'dominant') continue;
      if (!monster.moves.includes(moveId)) {
        if (monster.moves.length < 4) {
          monster.moves.push(moveId);
          messages.push(`Learned ${MOVES[moveId].name}!`);
        } else {
          messages.push(`Wants to learn ${MOVES[moveId].name} but knows 4 moves already.`);
        }
      }
    }
  }
  return messages;
}

/**
 * Heal a monster to full HP.
 */
function healMonster(monster) {
  monster.currentHp = monster.stats.maxHp;
}

/**
 * Display name: nickname if set, otherwise species name.
 */
function monsterName(monster) {
  return monster.nickname || SPECIES[monster.speciesId].name;
}

/**
 * Returns dominant count for quick display
 */
function dominantCount(monster) {
  return countDominantLoci(monster);
}
