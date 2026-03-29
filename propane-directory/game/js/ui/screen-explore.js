// screen-explore.js — Phaser 3 tile map exploration

'use strict';

// ── Map layout (16 × 12) ───────────────────────────────────────────────────
// '.' path  'g' light grass (15% encounter)  'G' tall grass (30%)  'w' wall
const ASHFIELD_MAP = [
  'wwwwwwwwwwwwwwww',
  'w..............w',
  'w...gg....gg...w',
  'w...gGg..gGg...w',
  'w..gg..........w',
  'w..gG..........w',
  'w..gG..........w',
  'w...gg..gg.....w',
  'w....gGgGg.....w',
  'w.....gg.......w',
  'w..............w',
  'wwwwwwwwwwwwwwww',
];
const PLAYER_START = { col: 11, row: 5 };

// Tile frame indices in the 16px tileset (frame = row*64 + col)
// Adjust these if the wrong tiles appear visually.
const TILE_FRAMES = {
  '.': 2,    // col 2,  row 0  — flat ground
  'g': 66,   // col 2,  row 1  — light grass
  'G': 67,   // col 3,  row 1  — tall grass
};

const TILE_PX   = 32;   // rendered tile size (2× the 16px source)
const MAP_COLS  = ASHFIELD_MAP[0].length;
const MAP_ROWS  = ASHFIELD_MAP.length;
const MAP_W     = MAP_COLS * TILE_PX;
const MAP_H     = MAP_ROWS * TILE_PX;

// ── Module state ───────────────────────────────────────────────────────────
let _phaserGame  = null;
let _currentArea = null;

// ── Entry point ────────────────────────────────────────────────────────────
GameBus.on('screen:explore:enter', function () {
  _renderAreaSelect();
});

// Destroy Phaser when navigating away
['hub', 'battle', 'stable', 'breed', 'title'].forEach(s => {
  GameBus.on(`screen:${s}:enter`, _destroyPhaser);
});

// ── Area select ────────────────────────────────────────────────────────────
function _renderAreaSelect() {
  _destroyPhaser();
  const el = document.getElementById('screen-explore');
  const areas = getUnlockedAreas(GameState);

  const cards = areas.map(area => {
    const names = area.encounterTable.map(e => SPECIES[e.speciesId].name).join(', ');
    return `<div class="area-card" data-area="${area.id}">
      <div class="area-name">${area.name}</div>
      <div class="area-desc">${area.description}</div>
      <div class="area-bugs">Bugs: ${names}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="explore-screen">
      <div class="screen-header">
        <button class="btn btn-back" id="btn-back-hub">← Back</button>
        <h2>🌿 Explore</h2>
      </div>
      <p class="explore-hint">Choose an area to search for wild bugs.</p>
      <div class="area-grid">${cards}</div>
    </div>
  `;

  document.getElementById('btn-back-hub').addEventListener('click', () => navigateTo('hub'));
  document.querySelectorAll('.area-card').forEach(card => {
    card.addEventListener('click', () => _enterMap(card.dataset.area));
  });
}

// ── Map entry ──────────────────────────────────────────────────────────────
function _enterMap(areaId) {
  _currentArea = areaId;
  const area   = AREAS[areaId];
  const el     = document.getElementById('screen-explore');

  el.innerHTML = `
    <div class="explore-screen">
      <div class="screen-header">
        <button class="btn btn-back" id="btn-back-areas">← Areas</button>
        <h2>🌿 ${area.name}</h2>
      </div>
      ${renderInventory()}
      <div class="map-container">
        <div id="map-phaser-container"></div>
        <div class="dpad">
          <div></div>
          <button class="dpad-btn" id="dpad-up">▲</button>
          <div></div>
          <button class="dpad-btn" id="dpad-left">◀</button>
          <div></div>
          <button class="dpad-btn" id="dpad-right">▶</button>
          <div></div>
          <button class="dpad-btn" id="dpad-down">▼</button>
          <div></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-areas').addEventListener('click', () => {
    _destroyPhaser();
    _renderAreaSelect();
  });

  // D-pad wired after Phaser boots (scene exposes move function)
  _bootPhaser();
}

// ── Phaser boot ────────────────────────────────────────────────────────────
function _bootPhaser() {
  if (_phaserGame) _destroyPhaser();

  _phaserGame = new Phaser.Game({
    type:            Phaser.AUTO,
    width:           MAP_W,
    height:          MAP_H,
    parent:          'map-phaser-container',
    backgroundColor: '#2d4a1e',
    physics:         { default: 'arcade', arcade: { debug: false } },
    scene:           [ExploreScene],
    scale: {
      mode:       Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Suppress Phaser's banner in the console
    banner: false,
  });
}

function _destroyPhaser() {
  if (_phaserGame) {
    _phaserGame.destroy(true);
    _phaserGame = null;
  }
}

// ── Phaser Scene ───────────────────────────────────────────────────────────
class ExploreScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ExploreScene' });
    this._playerCell = { ...PLAYER_START };
    this._canMove    = true;
  }

  preload() {
    this.load.spritesheet('tiles',
      'assets/Tileset/spr_tileset_sunnysideworld_16px.png',
      { frameWidth: 16, frameHeight: 16 });

    this.load.spritesheet('forest',
      'assets/Tileset/spr_tileset_sunnysideworld_forest_32px.png',
      { frameWidth: 32, frameHeight: 32 });

    this.load.spritesheet('player_walk',
      'assets/WALKING/base_walk_strip8.png',
      { frameWidth: 96, frameHeight: 64 });

    this.load.spritesheet('player_idle',
      'assets/IDLE/base_idle_strip9.png',
      { frameWidth: 96, frameHeight: 64 });
  }

  create() {
    // ── Draw tile map ──────────────────────────────────────────────────────
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const code = ASHFIELD_MAP[row][col];
        const cx   = col * TILE_PX + TILE_PX / 2;
        const cy   = row * TILE_PX + TILE_PX / 2;

        if (code === 'w') {
          // Forest tree tile (32px native, fits our 32px grid)
          this.add.image(cx, cy, 'forest', 0);
        } else {
          const frame = TILE_FRAMES[code] ?? TILE_FRAMES['.'];
          this.add.image(cx, cy, 'tiles', frame).setScale(2);
        }
      }
    }

    // ── Animations ─────────────────────────────────────────────────────────
    if (!this.anims.exists('walk')) {
      this.anims.create({
        key:       'walk',
        frames:    this.anims.generateFrameNumbers('player_walk', { start: 0, end: 7 }),
        frameRate: 8,
        repeat:    -1,
      });
    }
    if (!this.anims.exists('idle')) {
      this.anims.create({
        key:       'idle',
        frames:    this.anims.generateFrameNumbers('player_idle', { start: 0, end: 8 }),
        frameRate: 4,
        repeat:    -1,
      });
    }

    // ── Player sprite ───────────────────────────────────────────────────────
    const startX = PLAYER_START.col * TILE_PX + TILE_PX / 2;
    const startY = PLAYER_START.row * TILE_PX + TILE_PX / 2;
    this._player = this.add.sprite(startX, startY, 'player_idle')
      .setScale(0.4)      // 96px × 0.4 = ~38px — fits neatly in a 32px tile
      .setDepth(10)
      .play('idle');

    // ── Input ───────────────────────────────────────────────────────────────
    this._cursors = this.input.keyboard.createCursorKeys();
    this._wasd    = this.input.keyboard.addKeys('W,A,S,D');

    // ── Wire D-pad ──────────────────────────────────────────────────────────
    // D-pad buttons live outside Phaser's canvas; wire them after scene boots.
    const wire = (id, dx, dy) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this._doMove(dx, dy));
    };
    wire('dpad-up',    0, -1);
    wire('dpad-down',  0,  1);
    wire('dpad-left', -1,  0);
    wire('dpad-right', 1,  0);
  }

  update() {
    if (!this._canMove) return;

    const c = this._cursors;
    const w = this._wasd;

    if      (Phaser.Input.Keyboard.JustDown(c.left)  || Phaser.Input.Keyboard.JustDown(w.A)) this._doMove(-1,  0);
    else if (Phaser.Input.Keyboard.JustDown(c.right) || Phaser.Input.Keyboard.JustDown(w.D)) this._doMove( 1,  0);
    else if (Phaser.Input.Keyboard.JustDown(c.up)    || Phaser.Input.Keyboard.JustDown(w.W)) this._doMove( 0, -1);
    else if (Phaser.Input.Keyboard.JustDown(c.down)  || Phaser.Input.Keyboard.JustDown(w.S)) this._doMove( 0,  1);
  }

  _doMove(dx, dy) {
    const newCol = this._playerCell.col + dx;
    const newRow = this._playerCell.row + dy;

    if (newRow < 0 || newRow >= MAP_ROWS || newCol < 0 || newCol >= MAP_COLS) return;
    const tile = ASHFIELD_MAP[newRow][newCol];
    if (tile === 'w') return;

    this._playerCell = { col: newCol, row: newRow };
    this._canMove    = false;

    // Flip sprite for left/right movement
    if (dx < 0) this._player.setFlipX(true);
    else if (dx > 0) this._player.setFlipX(false);

    this._player.play('walk', true);

    const targetX = newCol * TILE_PX + TILE_PX / 2;
    const targetY = newRow * TILE_PX + TILE_PX / 2;

    this.tweens.add({
      targets:  this._player,
      x:        targetX,
      y:        targetY,
      duration: 150,
      ease:     'Linear',
      onComplete: () => {
        this._player.play('idle', true);
        this._canMove = true;
        this._checkEncounter(tile);
      },
    });
  }

  _checkEncounter(tile) {
    const chance = tile === 'G' ? 0.30 : tile === 'g' ? 0.15 : 0;
    if (chance === 0 || Math.random() > chance) return;

    if (GameState.stable.length === 0) {
      showToast('You need a bug to battle with!', 'error');
      return;
    }

    const playerMon = GameState.stable
      .slice()
      .sort((a, b) => b.currentHp - a.currentHp)[0];

    if (!playerMon || playerMon.currentHp <= 0) {
      showToast('All your bugs have fainted! Head to the stable to heal.', 'error');
      _destroyPhaser();
      navigateTo('hub');
      return;
    }

    const wildBug = rollEncounter(_currentArea);
    if (!wildBug) return;

    showToast(`A wild ${SPECIES[wildBug.speciesId].name} appeared!`, 'info');

    this._canMove = false;
    this.time.delayedCall(600, () => {
      _destroyPhaser();
      navigateTo('battle', {
        playerMonsterUid: playerMon.uid,
        enemyMonster:     wildBug,
        battleType:       'wild',
        returnToExplore:  true,
        areaId:           _currentArea,
      });
    });
  }
}
