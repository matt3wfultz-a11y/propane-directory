// screen-explore.js — Tile map exploration

'use strict';

// ── Asset paths ────────────────────────────────────────────────────────────
const ASSET_TILESET  = 'assets/Tileset/spr_tileset_sunnysideworld_16px.png';
const ASSET_FOREST   = 'assets/Tileset/spr_tileset_sunnysideworld_forest_32px.png';
const ASSET_WALK     = 'assets/WALKING/base_walk_strip8.png';
const ASSET_IDLE     = 'assets/IDLE/base_idle_strip9.png';

// ── Tile source coords in the 16px main tileset (sx, sy of top-left pixel) ─
// These are named constants — easy to adjust if the tile visually looks wrong.
const TILE_SRC = {
  '.': { sx: 16,  sy: 64  },   // flat ground
  'g': { sx: 32,  sy: 80  },   // light grass
  'G': { sx: 48,  sy: 80  },   // tall grass (encounter zone)
};
// 'w' wall tiles come from the 32px forest tileset (first tree frame, col 0 row 0)
const WALL_SRC = { sx: 0, sy: 0, sw: 32, sh: 32 };

// ── Render constants ───────────────────────────────────────────────────────
const TILE_SIZE     = 32;   // px on canvas (2× the 16px source)
const SRC_TILE_SIZE = 16;   // px in the tileset

// Player sprite source size (each frame is 96×64 in the strip)
const PLAYER_SRC_W = 96;
const PLAYER_SRC_H = 64;
// Draw player slightly larger than one tile so it's visible
const PLAYER_DST_W = 48;
const PLAYER_DST_H = 48;
const WALK_FRAMES  = 8;
const IDLE_FRAMES  = 9;

// ── Map layout for Ashfield (16 × 12) ─────────────────────────────────────
// '.' = path, 'g' = light grass (15% encounter), 'G' = tall grass (30%), 'w' = wall
const ASHFIELD_MAP = [
  'wwwwwwwwwwwwwwww',
  'w..............w',
  'w...gg....gg...w',
  'w...gGg..gGg...w',
  'w..gg..........w',
  'w..gG.........gw',
  'w..gG.........Gw',
  'w...gg..gg.....w',
  'w....gGgGg.....w',
  'w.....gg.......w',
  'w..............w',
  'wwwwwwwwwwwwwwww',
];
const PLAYER_START = { col: 8, row: 5 };

// ── Module state ───────────────────────────────────────────────────────────
let _imgs        = null;   // { tileset, forest, walk, idle }
let _playerPos   = null;   // { col, row }
let _facingLeft  = false;
let _animFrame   = 0;
let _isMoving    = false;
let _animTimer   = null;
let _rafId       = null;
let _canvas      = null;
let _ctx         = null;
let _currentArea = null;
let _inMap       = false;

// ── Entry point ────────────────────────────────────────────────────────────
GameBus.on('screen:explore:enter', function () {
  _inMap = false;
  _renderAreaSelect();
});

// Clean up map resources whenever we leave this screen
['hub','battle','stable','breed','title'].forEach(s => {
  GameBus.on(`screen:${s}:enter`, _cleanupMap);
});

// ── Area select ────────────────────────────────────────────────────────────
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
    card.addEventListener('click', () => _enterMap(card.dataset.area));
  });
}

// ── Map entry ──────────────────────────────────────────────────────────────
function _enterMap(areaId) {
  _currentArea = areaId;
  _playerPos = { ...PLAYER_START };
  _facingLeft = false;
  _animFrame = 0;
  _isMoving = false;
  _inMap = true;

  const area = AREAS[areaId];
  const el = document.getElementById('screen-explore');

  el.innerHTML = `
    <div class="explore-screen">
      <div class="screen-header">
        <button class="btn btn-back" id="btn-back-areas">← Areas</button>
        <h2>🌿 ${area.name}</h2>
      </div>
      ${renderInventory()}
      <div class="map-container">
        <canvas id="map-canvas" class="map-canvas"
          width="${ASHFIELD_MAP[0].length * TILE_SIZE}"
          height="${ASHFIELD_MAP.length * TILE_SIZE}"></canvas>
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
    _cleanupMap();
    _renderAreaSelect();
  });

  // D-pad
  document.getElementById('dpad-up').addEventListener('click',    () => _movePlayer(0, -1));
  document.getElementById('dpad-down').addEventListener('click',   () => _movePlayer(0,  1));
  document.getElementById('dpad-left').addEventListener('click',   () => _movePlayer(-1, 0));
  document.getElementById('dpad-right').addEventListener('click',  () => _movePlayer(1,  0));

  // Keyboard
  window.addEventListener('keydown', _onKeyDown);

  _canvas = document.getElementById('map-canvas');
  _ctx = _canvas.getContext('2d');
  _ctx.imageSmoothingEnabled = false;

  _loadImages().then(() => {
    _startRenderLoop();
  });
}

// ── Image loading ──────────────────────────────────────────────────────────
function _loadImages() {
  if (_imgs) return Promise.resolve();
  const load = src => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
  return Promise.all([
    load(ASSET_TILESET),
    load(ASSET_FOREST),
    load(ASSET_WALK),
    load(ASSET_IDLE),
  ]).then(([tileset, forest, walk, idle]) => {
    _imgs = { tileset, forest, walk, idle };
  });
}

// ── Render loop ────────────────────────────────────────────────────────────
function _startRenderLoop() {
  const loop = () => {
    if (!_inMap) return;
    _renderFrame();
    _rafId = requestAnimationFrame(loop);
  };
  _rafId = requestAnimationFrame(loop);
}

function _renderFrame() {
  if (!_ctx || !_imgs) return;
  const map  = ASHFIELD_MAP;
  const cols = map[0].length;
  const rows = map.length;
  _ctx.clearRect(0, 0, cols * TILE_SIZE, rows * TILE_SIZE);

  // Draw tiles
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const code = map[row][col];
      const dx = col * TILE_SIZE;
      const dy = row * TILE_SIZE;

      if (code === 'w') {
        // Use forest tree tileset
        _ctx.drawImage(
          _imgs.forest,
          WALL_SRC.sx, WALL_SRC.sy, WALL_SRC.sw, WALL_SRC.sh,
          dx, dy, TILE_SIZE, TILE_SIZE
        );
      } else {
        const src = TILE_SRC[code] || TILE_SRC['.'];
        _ctx.drawImage(
          _imgs.tileset,
          src.sx, src.sy, SRC_TILE_SIZE, SRC_TILE_SIZE,
          dx, dy, TILE_SIZE, TILE_SIZE
        );
      }
    }
  }

  // Draw player
  const strip = _isMoving ? _imgs.walk : _imgs.idle;
  const frames = _isMoving ? WALK_FRAMES : IDLE_FRAMES;
  const frame = _animFrame % frames;
  const sx = frame * PLAYER_SRC_W;

  const px = _playerPos.col * TILE_SIZE + (TILE_SIZE - PLAYER_DST_W) / 2;
  const py = _playerPos.row * TILE_SIZE + (TILE_SIZE - PLAYER_DST_H) / 2;

  _ctx.save();
  if (_facingLeft) {
    // Flip horizontally around the player's centre
    _ctx.translate(px + PLAYER_DST_W / 2, 0);
    _ctx.scale(-1, 1);
    _ctx.drawImage(strip, sx, 0, PLAYER_SRC_W, PLAYER_SRC_H, -PLAYER_DST_W / 2, py, PLAYER_DST_W, PLAYER_DST_H);
  } else {
    _ctx.drawImage(strip, sx, 0, PLAYER_SRC_W, PLAYER_SRC_H, px, py, PLAYER_DST_W, PLAYER_DST_H);
  }
  _ctx.restore();
}

// ── Movement ───────────────────────────────────────────────────────────────
function _onKeyDown(e) {
  const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
                w:'up', s:'down', a:'left', d:'right',
                W:'up', S:'down', A:'left', D:'right' };
  const dir = map[e.key];
  if (!dir) return;
  e.preventDefault();
  if (dir === 'up')    _movePlayer(0, -1);
  if (dir === 'down')  _movePlayer(0,  1);
  if (dir === 'left')  _movePlayer(-1, 0);
  if (dir === 'right') _movePlayer(1,  0);
}

function _movePlayer(dx, dy) {
  if (!_inMap) return;
  const newCol = _playerPos.col + dx;
  const newRow = _playerPos.row + dy;
  const map = ASHFIELD_MAP;

  // Bounds check
  if (newRow < 0 || newRow >= map.length || newCol < 0 || newCol >= map[0].length) return;

  const tile = map[newRow][newCol];
  if (tile === 'w') return;  // wall — blocked

  // Update position and facing
  _playerPos = { col: newCol, row: newRow };
  if (dx !== 0) _facingLeft = dx < 0;

  // Walk animation
  _isMoving = true;
  clearTimeout(_animTimer);
  _animFrame = (_animFrame + 1) % WALK_FRAMES;
  _animTimer = setTimeout(() => {
    _isMoving = false;
    _animFrame = 0;
  }, 300);

  _onStep(tile);
}

// ── Encounter logic ────────────────────────────────────────────────────────
function _onStep(tile) {
  const chance = tile === 'G' ? 0.30 : tile === 'g' ? 0.15 : 0;
  if (chance === 0 || Math.random() > chance) return;

  // Check party
  if (GameState.stable.length === 0) {
    showToast('You need a bug to battle with!', 'error');
    return;
  }
  const playerMon = GameState.stable.slice().sort((a, b) => b.currentHp - a.currentHp)[0];
  if (!playerMon || playerMon.currentHp <= 0) {
    showToast('All your bugs have fainted! Head to the stable to heal.', 'error');
    navigateTo('hub');
    return;
  }

  const wildBug = rollEncounter(_currentArea);
  if (!wildBug) return;

  const sp = SPECIES[wildBug.speciesId];
  showToast(`A wild ${sp.name} appeared!`, 'info');

  setTimeout(() => {
    _cleanupMap();
    navigateTo('battle', {
      playerMonsterUid: playerMon.uid,
      enemyMonster: wildBug,
      battleType: 'wild',
      returnToExplore: true,
      areaId: _currentArea,
    });
  }, 500);
}

// ── Cleanup ────────────────────────────────────────────────────────────────
function _cleanupMap() {
  _inMap = false;
  window.removeEventListener('keydown', _onKeyDown);
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (_animTimer) { clearTimeout(_animTimer); _animTimer = null; }
}
