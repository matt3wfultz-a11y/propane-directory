// panels.js — Title, Battle, and Roster overlay panels
// Depends on: utils.js, species.js, monster.js, battle.js, state.js (all loaded before this)

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   TitlePanel — new-game wizard (name → starter pick → confirm)
═══════════════════════════════════════════════════════════════════════════ */
class TitlePanel {
  constructor() {
    this._el         = document.getElementById('panel-title');
    this._nameStep   = document.getElementById('title-name-step');
    this._startStep  = document.getElementById('title-starter-step');
    this._nameInput  = document.getElementById('input-player-name');
    this._nextBtn    = document.getElementById('btn-title-next');
    this._confirmBtn = document.getElementById('btn-title-confirm');
    this._grid       = document.getElementById('starter-grid');
    this._selected   = null;

    this._nextBtn.addEventListener('click',    () => this._onNext());
    this._confirmBtn.addEventListener('click', () => this._onConfirm());
    this._nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._onNext();
    });
  }

  show() {
    // If a save already exists skip straight to the map
    if (hasSave() && loadState()) {
      document.getElementById('btn-bag').classList.remove('hidden');
      this.hide();
      return;
    }
    this._el.classList.remove('hidden');
    this._nameStep.classList.remove('hidden');
    this._startStep.classList.add('hidden');
    this._nameInput.value = '';
    setTimeout(() => this._nameInput.focus(), 50);
  }

  hide() {
    this._el.classList.add('hidden');
  }

  _onNext() {
    const name = this._nameInput.value.trim();
    if (!name) { this._nameInput.focus(); return; }
    this._nameStep.classList.add('hidden');
    this._startStep.classList.remove('hidden');
    this._renderStarters();
  }

  _renderStarters() {
    const STARTER_IDS = ['SCORCHMITE', 'BOGSLOG', 'BRAMBLESTICK'];
    this._grid.innerHTML = '';
    this._selected = null;
    this._confirmBtn.disabled = true;

    for (const id of STARTER_IDS) {
      const sp   = SPECIES[id];
      const card = document.createElement('div');
      card.className       = 'starter-card';
      card.dataset.species = id;
      card.innerHTML = `
        <div class="starter-emoji">${sp.emoji}</div>
        <div class="starter-label">${sp.type}</div>
        <div class="starter-name">${sp.name}</div>
        <div class="starter-tagline">${sp.description}</div>
      `;
      card.addEventListener('click', () => this._selectStarter(id));
      this._grid.appendChild(card);
    }
  }

  _selectStarter(id) {
    this._selected = id;
    this._grid.querySelectorAll('.starter-card').forEach(c => {
      c.classList.toggle('starter-selected', c.dataset.species === id);
    });
    this._confirmBtn.disabled = false;
  }

  _onConfirm() {
    if (!this._selected) return;
    const name = this._nameInput.value.trim() || 'Collector';
    newGame(name);
    const starter = createMonster(this._selected, 5);
    starter.caughtAt = 'Starter';
    addToStable(starter);
    saveState();
    document.getElementById('btn-bag').classList.remove('hidden');
    this.hide();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   BattlePanel — wild encounter overlay
═══════════════════════════════════════════════════════════════════════════ */
class BattlePanel {
  constructor() {
    this._el           = document.getElementById('panel-battle');
    this._enemyName    = document.getElementById('battle-enemy-name');
    this._enemyHpBar   = document.getElementById('battle-enemy-hp-bar');
    this._enemyHpText  = document.getElementById('battle-enemy-hp-text');
    this._enemyEmoji   = document.getElementById('battle-enemy-emoji');
    this._playerName   = document.getElementById('battle-player-name');
    this._playerHpBar  = document.getElementById('battle-player-hp-bar');
    this._playerHpText = document.getElementById('battle-player-hp-text');
    this._playerEmoji  = document.getElementById('battle-player-emoji');
    this._log          = document.getElementById('battle-log');
    this._fightBtn     = document.getElementById('btn-battle-fight');
    this._jarBtn       = document.getElementById('btn-battle-jar');
    this._runBtn       = document.getElementById('btn-battle-run');

    this._state        = null;
    this._playerMonRef = null;

    this._fightBtn.addEventListener('click', () => this._onFight());
    this._jarBtn.addEventListener('click',   () => this._onJar());
    this._runBtn.addEventListener('click',   () => this._onRun());
  }

  show(wildMon, playerMon) {
    this._playerMonRef = playerMon;
    this._state = initBattle(playerMon, wildMon, 'wild');
    this._log.innerHTML = '';
    const wild = SPECIES[wildMon.speciesId];
    this._appendLog(`A wild ${wild ? wild.name : monsterName(wildMon)} appeared!`);
    this._updateUI();
    this._el.classList.remove('hidden');
    GameBus.emit('battle:lock');
  }

  hide() {
    this._el.classList.add('hidden');
    GameBus.emit('battle:unlock');
  }

  // ── Button handlers ────────────────────────────────────────────────────

  _onFight() {
    if (!this._state || this._state.phase === 'ended') return;
    const moveId = this._state.playerMonster.moves[0];
    if (!moveId) return;
    executeTurn(this._state, moveId, 1);
    this._afterTurn();
  }

  _onJar() {
    if (!this._state || this._state.phase === 'ended') return;
    executeTurn(this._state, 'catch:basicNet', 1);
    if (this._state.caught && this._state.caughtMonster) {
      if (addToStable(this._state.caughtMonster)) {
        saveState();
        this._appendLog(`${monsterName(this._state.caughtMonster)} was added to your jar! 🫙`, 'log-catch');
      } else {
        this._appendLog('Your jar is full! (max 30 bugs)', 'log-faint');
      }
    }
    this._afterTurn();
  }

  _onRun() {
    // Wild encounters are always escapable in Milestone 1
    this._appendLog('Got away safely!');
    this._endBattle(800);
  }

  // ── Turn resolution ────────────────────────────────────────────────────

  _afterTurn() {
    for (const msg of (this._state.log || [])) {
      const cls = msg.includes('super effective') ? 'log-super'
                : msg.includes('fainted')         ? 'log-faint'
                : msg.includes('jar')             ? 'log-catch'
                : null;
      this._appendLog(msg, cls);
    }
    this._state.log = [];
    this._updateUI();
    if (this._state.phase === 'ended') this._endBattle(1400);
  }

  _endBattle(delay = 1000) {
    // Sync player HP back; guard against faint (set to 1)
    if (this._playerMonRef && this._state) {
      this._playerMonRef.currentHp =
        Math.max(1, this._state.playerMonster.currentHp);
      saveState();
    }
    this._setButtons(false);
    setTimeout(() => this.hide(), delay);
  }

  // ── UI helpers ─────────────────────────────────────────────────────────

  _updateUI() {
    if (!this._state) return;
    const em = this._state.enemyMonster;
    const pm = this._state.playerMonster;
    const es = SPECIES[em.speciesId];
    const ps = SPECIES[pm.speciesId];

    this._enemyEmoji.textContent  = es ? es.emoji : '❓';
    this._playerEmoji.textContent = ps ? ps.emoji : '🐛';

    this._enemyName.textContent   = `${monsterName(em)}  Lv.${em.level}`;
    this._enemyHpText.textContent = `${Math.max(0, em.currentHp)} / ${em.stats.maxHp}`;
    this._setHpBar(this._enemyHpBar, em.currentHp, em.stats.maxHp);

    this._playerName.textContent   = `${monsterName(pm)}  Lv.${pm.level}`;
    this._playerHpText.textContent = `${Math.max(0, pm.currentHp)} / ${pm.stats.maxHp}`;
    this._setHpBar(this._playerHpBar, pm.currentHp, pm.stats.maxHp);

    const ended       = this._state.phase === 'ended';
    const enemyHpPct  = em.currentHp / em.stats.maxHp;
    this._setButtons(!ended);
    this._jarBtn.disabled = ended || enemyHpPct >= 0.50;
  }

  _setButtons(enabled) {
    this._fightBtn.disabled = !enabled;
    this._runBtn.disabled   = !enabled;
    // Jar has its own additional condition — only touch if enabling
    if (!enabled) this._jarBtn.disabled = true;
  }

  _setHpBar(el, current, max) {
    const pct = Math.max(0, Math.round((current / max) * 100));
    el.style.width = pct + '%';
    el.className = 'hp-bar ' + (pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low');
  }

  _appendLog(msg, cls) {
    const p = document.createElement('p');
    p.textContent = msg;
    if (cls) p.classList.add(cls);
    this._log.appendChild(p);
    this._log.scrollTop = this._log.scrollHeight;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RosterPanel — view caught bugs
═══════════════════════════════════════════════════════════════════════════ */
class RosterPanel {
  constructor() {
    this._el       = document.getElementById('panel-roster');
    this._list     = document.getElementById('roster-list');
    this._closeBtn = document.getElementById('btn-roster-close');

    this._closeBtn.addEventListener('click', () => this.hide());
    this._el.addEventListener('click', e => { if (e.target === this._el) this.hide(); });
  }

  show() {
    this._render();
    this._el.classList.remove('hidden');
  }

  hide() {
    this._el.classList.add('hidden');
  }

  _render() {
    this._list.innerHTML = '';

    if (!GameState || !GameState.stable || GameState.stable.length === 0) {
      this._list.innerHTML =
        '<p class="empty-stable">No bugs caught yet.<br>Walk on grass to find them!</p>';
      return;
    }

    for (const mon of GameState.stable) {
      const sp  = SPECIES[mon.speciesId];
      const pct = Math.round((mon.currentHp / mon.stats.maxHp) * 100);
      const hpCls = pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';
      const card = document.createElement('div');
      card.className = 'monster-card';
      card.style.setProperty('--species-color', sp ? sp.color : '#6c8fff');
      card.innerHTML = `
        <div class="card-header">
          <span class="mon-emoji">${sp ? sp.emoji : '❓'}</span>
          <span class="mon-name">${monsterName(mon)}</span>
          <span class="mon-level">Lv.${mon.level}</span>
        </div>
        <div class="hp-bar-wrap">
          <div class="hp-bar ${hpCls}" style="width:${pct}%"></div>
        </div>
        <div class="hp-text">${Math.max(0, mon.currentHp)} / ${mon.stats.maxHp} HP</div>
        <div class="dom-score">${sp ? sp.name : '?'} · ${sp ? sp.type : '?'}</div>
      `;
      this._list.appendChild(card);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Bootstrap — wires everything together after DOM is ready
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadState(); // populates GameState if a save exists; no-op if not

  const titlePanel  = new TitlePanel();
  const battlePanel = new BattlePanel();
  const rosterPanel = new RosterPanel();

  titlePanel.show();

  document.getElementById('btn-bag').addEventListener('click', () => {
    rosterPanel.show();
  });

  GameBus.on('encounter', ({ wildMon, playerMon }) => {
    battlePanel.show(wildMon, playerMon);
  });
});
