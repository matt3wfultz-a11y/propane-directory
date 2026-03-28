// screen-battle.js — Turn-based battle UI

'use strict';

let _battleState = null;
let _battleParams = null;

GameBus.on('screen:battle:enter', function (params) {
  _battleParams = params;
  const playerMon = getMonster(params.playerMonsterUid);
  if (!playerMon) { navigateTo('hub'); return; }

  _battleState = initBattle(playerMon, params.enemyMonster, params.battleType);
  _renderBattle();
});

function _renderBattle() {
  const el = document.getElementById('screen-battle');
  const bs = _battleState;
  const pm = bs.playerMonster;
  const em = bs.enemyMonster;
  const pmSp = SPECIES[pm.speciesId];
  const emSp = SPECIES[em.speciesId];

  const statusLabel = s => s ? ` <span class="status-badge status-${s}">${s.toUpperCase()}</span>` : '';

  el.innerHTML = `
    <div class="battle-screen">
      <!-- Enemy info -->
      <div class="battle-enemy-info">
        <div class="battle-mon-name">${monsterName(em)} <span class="battle-level">Lv.${em.level}</span>${statusLabel(bs.statusEffects.enemy)}</div>
        <div class="battle-type-badge type-${emSp.type.toLowerCase()}">${emSp.type}</div>
        ${renderHPBar(em.currentHp, em.stats.maxHp)}
        ${renderTraits(em, false)}
      </div>

      <!-- Battle sprites / emoji area -->
      <div class="battle-arena">
        <div class="battle-enemy-sprite" style="color:${emSp.color}">${emSp.emoji}</div>
        <div class="battle-player-sprite" style="color:${pmSp.color}">${pmSp.emoji}</div>
      </div>

      <!-- Player info -->
      <div class="battle-player-info">
        <div class="battle-mon-name">${monsterName(pm)} <span class="battle-level">Lv.${pm.level}</span>${statusLabel(bs.statusEffects.player)}</div>
        ${renderHPBar(pm.currentHp, pm.stats.maxHp)}
      </div>

      <!-- Action panel -->
      <div class="battle-actions" id="battle-actions">
        ${_renderMoveButtons()}
        ${_renderUtilityButtons()}
      </div>

      <!-- Battle log -->
      <div class="battle-log" id="battle-log">
        <p>A wild <strong>${emSp.name}</strong> appeared!</p>
      </div>
    </div>
  `;

  _wireActionButtons();
}

function _renderMoveButtons() {
  const pm = _battleState.playerMonster;
  return pm.moves.map(moveId => {
    const move = MOVES[moveId];
    if (!move) return '';
    const pp = _battleState.movePP.player[moveId] || 0;
    const disabled = pp <= 0 ? 'disabled' : '';
    return `<button class="move-btn type-${move.type.toLowerCase()}" data-move="${moveId}" ${disabled}>
      <span class="move-name">${move.name}</span>
      <span class="move-meta">${move.type} • ${pp}pp</span>
    </button>`;
  }).join('');
}

function _renderUtilityButtons() {
  const isWild = _battleParams.battleType === 'wild';
  let html = '';

  if (isWild) {
    const inv = GameState.inventory;
    const netOptions = [];
    if (inv.basicNets > 0 && inv.glassJars > 0) netOptions.push(`<button class="util-btn" data-action="catch:basicNets">🕸 Basic Net (${inv.basicNets})</button>`);
    if (inv.fineNets > 0 && inv.glassJars > 0) netOptions.push(`<button class="util-btn" data-action="catch:fineNets">🥅 Fine Net (${inv.fineNets})</button>`);
    if (inv.silkNets > 0 && inv.glassJars > 0) netOptions.push(`<button class="util-btn" data-action="catch:silkNets">✨🕸 Silk Net (${inv.silkNets})</button>`);

    if (inv.glassJars <= 0) {
      html += `<button class="util-btn" disabled title="No glass jars left!">🫙 No Jars!</button>`;
    } else {
      html += netOptions.join('');
    }
    html += `<button class="util-btn util-flee" data-action="flee">🏃 Flee</button>`;
  }
  return html;
}

function _wireActionButtons() {
  document.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => _doPlayerAction(btn.dataset.move));
  });
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => _doPlayerAction(btn.dataset.action));
  });
}

function _doPlayerAction(action) {
  // Disable all buttons during resolution
  document.querySelectorAll('.move-btn, .util-btn').forEach(b => b.disabled = true);

  // Handle catch: deduct net and jar from inventory
  if (typeof action === 'string' && action.startsWith('catch:')) {
    const netKey = action.split(':')[1]; // e.g. 'basicNets'
    const netTypeMap = { basicNets: 'basicNet', fineNets: 'fineNet', silkNets: 'silkNet' };
    const netType = netTypeMap[netKey] || 'basicNet';

    if (!useNet(netKey)) {
      showToast('No nets or jars left!', 'error');
      _reEnableButtons();
      return;
    }
    executeTurn(_battleState, `catch:${netType}`, 1);
  } else {
    const aiTier = _battleParams.battleType === 'trainer' ? 2 : 1;
    executeTurn(_battleState, action, aiTier);
  }

  _displayLog(_battleState.log);

  setTimeout(() => {
    if (_battleState.phase === 'ended') {
      _handleBattleEnd();
    } else {
      _updateUI();
      _reEnableButtons();
    }
  }, 400);
}

function _displayLog(lines) {
  const logEl = document.getElementById('battle-log');
  if (!logEl) return;
  logEl.innerHTML = lines.map(l => `<p>${l}</p>`).join('');
  logEl.scrollTop = logEl.scrollHeight;
}

function _updateUI() {
  const pm = _battleState.playerMonster;
  const em = _battleState.enemyMonster;

  const pmHPEl = document.querySelector('.battle-player-info .hp-bar-wrap');
  const pmHPText = document.querySelector('.battle-player-info .hp-text');
  const emHPEl = document.querySelector('.battle-enemy-info .hp-bar-wrap');
  const emHPText = document.querySelector('.battle-enemy-info .hp-text');

  function pct(cur, max) { return Math.max(0, Math.min(100, Math.round((cur/max)*100))); }

  if (pmHPEl) {
    const p = pct(pm.currentHp, pm.stats.maxHp);
    const cls = p <= 25 ? 'hp-low' : p <= 50 ? 'hp-mid' : 'hp-high';
    pmHPEl.querySelector('.hp-bar').style.width = p + '%';
    pmHPEl.querySelector('.hp-bar').className = `hp-bar ${cls}`;
  }
  if (pmHPText) pmHPText.textContent = `${pm.currentHp}/${pm.stats.maxHp}`;

  if (emHPEl) {
    const p = pct(em.currentHp, em.stats.maxHp);
    const cls = p <= 25 ? 'hp-low' : p <= 50 ? 'hp-mid' : 'hp-high';
    emHPEl.querySelector('.hp-bar').style.width = p + '%';
    emHPEl.querySelector('.hp-bar').className = `hp-bar ${cls}`;
  }
  if (emHPText) emHPText.textContent = `${em.currentHp}/${em.stats.maxHp}`;

  // Refresh move buttons (PP may have changed)
  const actionsEl = document.getElementById('battle-actions');
  if (actionsEl) {
    actionsEl.innerHTML = _renderMoveButtons() + _renderUtilityButtons();
    _wireActionButtons();
  }
}

function _reEnableButtons() {
  document.querySelectorAll('.move-btn').forEach(b => {
    const moveId = b.dataset.move;
    if ((_battleState.movePP.player[moveId] || 0) <= 0) {
      b.disabled = true;
    } else {
      b.disabled = false;
    }
  });
  document.querySelectorAll('.util-btn').forEach(b => { b.disabled = false; });
}

function _handleBattleEnd() {
  const bs = _battleState;
  const params = _battleParams;

  const result = applyBattleResult(bs, params.playerMonsterUid);
  const logEl = document.getElementById('battle-log');

  let summary = '';
  if (bs.fled) {
    summary = 'You fled the battle.';
  } else if (bs.caught) {
    summary = `Caught ${monsterName(bs.caughtMonster)}!`;
  } else if (bs.winner === 'player') {
    summary = 'You won!';
  } else {
    summary = `${monsterName(bs.playerMonster)} fainted...`;
  }

  const allMessages = [...bs.log, summary, ...result.messages];
  if (logEl) {
    logEl.innerHTML = allMessages.map(l => `<p>${l}</p>`).join('');
  }

  // Call trainer win callback if present
  if (bs.winner === 'player' && params.onWin) {
    params.onWin();
  }

  // Add return button
  const actionsEl = document.getElementById('battle-actions');
  if (actionsEl) {
    const returnLabel = params.returnToExplore ? 'Back to Explore' : 'Back to Hub';
    actionsEl.innerHTML = `<button id="btn-battle-return" class="btn btn-primary btn-large">${returnLabel}</button>`;
    document.getElementById('btn-battle-return').addEventListener('click', () => {
      if (params.returnToExplore) {
        navigateTo('explore');
      } else {
        navigateTo('hub');
      }
    });
  }
}
