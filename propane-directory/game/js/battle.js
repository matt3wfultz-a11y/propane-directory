// battle.js — Turn-based battle engine

'use strict';

// Stat stage multipliers: index 0 = stage -6 ... index 12 = stage +6
// We use a symmetric table anchored at index 6 (stage 0)
const STAGE_TABLE = [0.25, 0.28, 0.33, 0.40, 0.50, 0.67, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];

function stageMultiplier(stage) {
  const idx = clamp(stage + 6, 0, 12);
  return STAGE_TABLE[idx];
}

function effectiveStat(base, stage) {
  return Math.round(base * stageMultiplier(stage));
}

/**
 * Initialize a battle state object.
 * @param {Object} playerMonster — original monster (will be deep-cloned)
 * @param {Object} enemyMonster
 * @param {'wild'|'trainer'} battleType
 */
function initBattle(playerMonster, enemyMonster, battleType) {
  const p = deepClone(playerMonster);
  const e = deepClone(enemyMonster);

  // Build PP maps
  function buildPP(monster) {
    const pp = {};
    for (const moveId of monster.moves) {
      pp[moveId] = MOVES[moveId] ? MOVES[moveId].pp : 10;
    }
    return pp;
  }

  return {
    playerMonster: p,
    enemyMonster: e,
    battleType,
    turn: 1,
    log: [],
    phase: 'selectMove', // 'selectMove' | 'resolving' | 'catchPhase' | 'ended'
    winner: null,        // 'player' | 'enemy' | null
    fled: false,
    statStages: {
      player: { atk: 0, def: 0, spd: 0 },
      enemy:  { atk: 0, def: 0, spd: 0 },
    },
    movePP: {
      player: buildPP(p),
      enemy:  buildPP(e),
    },
    statusEffects: {
      player: null, // 'poison' | 'burn' | 'paralyze' | null
      enemy:  null,
    },
  };
}

/**
 * Damage formula (Gen I inspired).
 */
function calcDamage(attacker, atkStage, defender, defStage, move) {
  if (move.category === 'status' || move.power === 0) return 0;

  const atkStat = effectiveStat(attacker.stats.atk, atkStage);
  const defStat = effectiveStat(defender.stats.def, defStage);

  const raw = ((2 * attacker.level / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2;

  const attackerType = SPECIES[attacker.speciesId].type;
  const defenderType = SPECIES[defender.speciesId].type;
  const typeMult = (TYPE_CHART[move.type] && TYPE_CHART[move.type][defenderType]) || 1.0;

  const isCrit = Math.random() < 0.0625;
  const critMult = isCrit ? 1.5 : 1.0;
  const randomFactor = randFloat(0.85, 1.0);

  const damage = Math.max(1, Math.round(raw * typeMult * critMult * randomFactor));

  return { damage, typeMult, isCrit };
}

/**
 * Apply a move effect.
 */
function applyEffect(state, effect, source) {
  if (!effect) return;
  const target = effect.target === 'enemy'
    ? (source === 'player' ? 'enemy' : 'player')
    : source;

  const chance = effect.chance !== undefined ? effect.chance : 1.0;
  if (Math.random() > chance) return;

  if (effect.type === 'statDebuff' || effect.type === 'statBuff') {
    const stages = effect.stages;
    const current = state.statStages[target][effect.stat] || 0;
    state.statStages[target][effect.stat] = clamp(current + stages, -3, 3);
    const dir = stages > 0 ? 'rose' : 'fell';
    const mag = Math.abs(stages) > 1 ? ' sharply' : '';
    const name = target === 'player'
      ? monsterName(state.playerMonster)
      : monsterName(state.enemyMonster);
    state.log.push(`${name}'s ${effect.stat.toUpperCase()}${mag} ${dir}!`);
  } else if (effect.type === 'poison' || effect.type === 'burn' || effect.type === 'paralyze') {
    if (!state.statusEffects[target]) {
      state.statusEffects[target] = effect.type;
      const name = target === 'player'
        ? monsterName(state.playerMonster)
        : monsterName(state.enemyMonster);
      const labels = { poison: 'poisoned', burn: 'burned', paralyze: 'paralyzed' };
      state.log.push(`${name} was ${labels[effect.type]}!`);
    }
  }
}

/**
 * Apply end-of-turn status effects.
 */
function applyStatusTick(state, side) {
  const status = state.statusEffects[side];
  if (!status) return;
  const monster = side === 'player' ? state.playerMonster : state.enemyMonster;
  const name = monsterName(monster);

  if (status === 'poison') {
    const dmg = Math.max(1, Math.floor(monster.stats.maxHp / 8));
    monster.currentHp = Math.max(0, monster.currentHp - dmg);
    state.log.push(`${name} is hurt by poison! (-${dmg} HP)`);
  } else if (status === 'burn') {
    const dmg = Math.max(1, Math.floor(monster.stats.maxHp / 16));
    monster.currentHp = Math.max(0, monster.currentHp - dmg);
    state.log.push(`${name} is hurt by its burn! (-${dmg} HP)`);
  }
  // Paralyze only affects speed (handled in turn order) — no HP damage
}

/**
 * Enemy AI: pick a move.
 * tierLevel: 1 = random; 2 = prefer super-effective
 */
function enemyPickMove(state, tierLevel) {
  const em = state.enemyMonster;
  const available = em.moves.filter(id => (state.movePP.enemy[id] || 0) > 0);
  if (available.length === 0) return 'TACKLE'; // struggle fallback

  if (tierLevel >= 2) {
    const defType = SPECIES[state.playerMonster.speciesId].type;
    const superEffective = available.filter(id => {
      const move = MOVES[id];
      return move && (TYPE_CHART[move.type] || {})[defType] === 2.0;
    });
    if (superEffective.length > 0) return pickRandom(superEffective);
  }
  return pickRandom(available);
}

/**
 * Execute one full turn.
 * @param {Object} state — battleState (mutated in place)
 * @param {string} playerAction — moveId or 'flee' or 'catch:netType'
 * @param {number} [aiTier=1]
 * @returns {Object} state
 */
function executeTurn(state, playerAction, aiTier) {
  aiTier = aiTier || 1;
  if (state.phase === 'ended') return state;

  state.log = []; // reset log for this turn batch
  state.turn += 1;

  // ── Handle flee ──────────────────────────────────────────────────────────
  if (playerAction === 'flee') {
    if (state.battleType === 'trainer') {
      state.log.push("Can't flee from a trainer battle!");
      return state;
    }
    // Flee success chance based on speed
    const playerSpd = effectiveStat(state.playerMonster.stats.spd, state.statStages.player.spd);
    const enemySpd = effectiveStat(state.enemyMonster.stats.spd, state.statStages.enemy.spd);
    const fleeChance = playerSpd >= enemySpd ? 1.0 : 0.5 + (playerSpd / enemySpd) * 0.4;
    if (Math.random() < fleeChance) {
      state.log.push('Got away safely!');
      state.fled = true;
      state.phase = 'ended';
      state.winner = null;
    } else {
      state.log.push("Couldn't get away!");
      // Enemy still attacks
      _resolveEnemyAction(state, aiTier);
    }
    _checkWinLoss(state);
    return state;
  }

  // ── Handle catch attempt ─────────────────────────────────────────────────
  if (typeof playerAction === 'string' && playerAction.startsWith('catch:')) {
    if (state.battleType === 'trainer') {
      state.log.push("Can't catch trainer bugs!");
      return state;
    }
    const netType = playerAction.split(':')[1];
    const result = attemptCatch(state.enemyMonster, netType);
    if (result.success) {
      state.log.push(`Caught ${monsterName(state.enemyMonster)} in a glass jar!`);
      state.phase = 'ended';
      state.winner = 'player';
      state.caught = true;
      state.caughtMonster = deepClone(state.enemyMonster);
    } else {
      state.log.push(`${monsterName(state.enemyMonster)} broke free!`);
      _resolveEnemyAction(state, aiTier);
    }
    _checkWinLoss(state);
    return state;
  }

  // ── Resolve both sides' moves ─────────────────────────────────────────────
  const playerMoveId = playerAction;
  const enemyMoveId  = enemyPickMove(state, aiTier);

  // Determine order by speed (paralyze halves speed)
  const playerSpd = effectiveStat(state.playerMonster.stats.spd, state.statStages.player.spd)
    * (state.statusEffects.player === 'paralyze' ? 0.5 : 1);
  const enemySpd = effectiveStat(state.enemyMonster.stats.spd, state.statStages.enemy.spd)
    * (state.statusEffects.enemy === 'paralyze' ? 0.5 : 1);

  const playerGoesFirst = playerSpd > enemySpd || (playerSpd === enemySpd && Math.random() < 0.5);

  if (playerGoesFirst) {
    _resolveMove(state, 'player', playerMoveId);
    if (state.phase !== 'ended') _resolveMove(state, 'enemy', enemyMoveId);
  } else {
    _resolveMove(state, 'enemy', enemyMoveId);
    if (state.phase !== 'ended') _resolveMove(state, 'player', playerMoveId);
  }

  // Status tick
  if (state.phase !== 'ended') {
    applyStatusTick(state, 'player');
    applyStatusTick(state, 'enemy');
    _checkWinLoss(state);
  }

  return state;
}

function _resolveMove(state, side, moveId) {
  const attacker = side === 'player' ? state.playerMonster : state.enemyMonster;
  const defender = side === 'player' ? state.enemyMonster : state.playerMonster;
  const atkSide = side;
  const defSide = side === 'player' ? 'enemy' : 'player';

  const move = MOVES[moveId] || MOVES['TACKLE'];
  const attackerName = monsterName(attacker);

  // Use up PP
  if (state.movePP[atkSide][moveId] > 0) {
    state.movePP[atkSide][moveId] -= 1;
  }

  state.log.push(`${attackerName} used ${move.name}!`);

  // Accuracy check
  if (move.accuracy < 1.0 && Math.random() > move.accuracy) {
    state.log.push('But it missed!');
    return;
  }

  if (move.category !== 'status' && move.power > 0) {
    const atkStage = state.statStages[atkSide].atk;
    const defStage = state.statStages[defSide].def;
    const result = calcDamage(attacker, atkStage, defender, defStage, move);
    defender.currentHp = Math.max(0, defender.currentHp - result.damage);

    if (result.typeMult >= 2.0) state.log.push("It's super effective!");
    if (result.typeMult <= 0.5) state.log.push("It's not very effective...");
    if (result.isCrit) state.log.push('A critical hit!');
    state.log.push(`-${result.damage} HP`);
  }

  // Apply effect
  if (move.effect) {
    applyEffect(state, move.effect, atkSide);
  }

  _checkWinLoss(state);
}

function _resolveEnemyAction(state, aiTier) {
  if (state.phase === 'ended') return;
  const enemyMoveId = enemyPickMove(state, aiTier);
  _resolveMove(state, 'enemy', enemyMoveId);
}

function _checkWinLoss(state) {
  if (state.phase === 'ended') return;
  if (state.playerMonster.currentHp <= 0) {
    state.log.push(`${monsterName(state.playerMonster)} fainted!`);
    state.phase = 'ended';
    state.winner = 'enemy';
  } else if (state.enemyMonster.currentHp <= 0) {
    state.log.push(`${monsterName(state.enemyMonster)} fainted!`);
    state.phase = 'ended';
    state.winner = 'player';
  }
}

/**
 * Compute XP reward for defeating an enemy.
 */
function calcXPReward(enemyMonster) {
  const sp = SPECIES[enemyMonster.speciesId];
  return Math.floor((sp.baseXpYield * enemyMonster.level) / 5);
}
