// BugJar — simple tile map with walking character

const TILE   = 32;   // rendered tile size in pixels
const COLS   = 20;
const ROWS   = 15;

// Simple map: 0 = grass, 1 = dirt path, 2 = tree (wall)
const MAP = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,2,2,0,0,0,0,0,0,0,0,0,2,2,0,0,0,2],
  [2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,2],
  [2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2],
  [2,0,0,2,2,0,0,0,0,0,0,0,0,0,2,2,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

// Tile frame indices in spr_tileset_sunnysideworld_16px.png
// The sheet is 1024x1024 with 16px tiles = 64 tiles per row
// frame = row * 64 + col
const TILE_FRAMES = {
  0: 2,    // grass  — col 2, row 0
  1: 66,   // dirt   — col 2, row 1
  2: null, // tree   — use forest spritesheet instead
};

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.spritesheet('tiles',
      'assets/Tileset/spr_tileset_sunnysideworld_16px.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('trees',
      'assets/Tileset/spr_tileset_sunnysideworld_forest_32px.png',
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet('player_walk',
      'assets/WALKING/base_walk_strip8.png',
      { frameWidth: 96, frameHeight: 64 }
    );
    this.load.spritesheet('player_idle',
      'assets/IDLE/base_idle_strip9.png',
      { frameWidth: 96, frameHeight: 64 }
    );
  }

  create() {
    // Draw tiles
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tileType = MAP[row][col];
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;

        if (tileType === 2) {
          // Tree — from forest sheet, native 32px
          this.add.image(x, y, 'trees', 0);
        } else {
          // Ground/path — from main sheet, scaled 2x
          this.add.image(x, y, 'tiles', TILE_FRAMES[tileType]).setScale(2);
        }
      }
    }

    // Player animations
    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('player_walk', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('player_idle', { start: 0, end: 8 }),
      frameRate: 6,
      repeat: -1,
    });

    // Place player in the centre of the map
    this.player = this.add.sprite(
      10 * TILE + TILE / 2,
      7  * TILE + TILE / 2,
      'player_idle'
    ).setScale(2.0).setDepth(10).play('idle');

    this._cell    = { col: 10, row: 7 };
    this._canMove = true;

    // Input
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  }

  update() {
    if (!this._canMove) return;

    const k = this.keys;
    let dx = 0, dy = 0;

    if      (Phaser.Input.Keyboard.JustDown(k.A) || Phaser.Input.Keyboard.JustDown(k.LEFT))  dx = -1;
    else if (Phaser.Input.Keyboard.JustDown(k.D) || Phaser.Input.Keyboard.JustDown(k.RIGHT)) dx =  1;
    else if (Phaser.Input.Keyboard.JustDown(k.W) || Phaser.Input.Keyboard.JustDown(k.UP))    dy = -1;
    else if (Phaser.Input.Keyboard.JustDown(k.S) || Phaser.Input.Keyboard.JustDown(k.DOWN))  dy =  1;

    if (dx !== 0 || dy !== 0) this._move(dx, dy);
  }

  _move(dx, dy) {
    const newCol = this._cell.col + dx;
    const newRow = this._cell.row + dy;

    // Bounds + wall check
    if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) return;
    if (MAP[newRow][newCol] === 2) return;

    this._cell = { col: newCol, row: newRow };
    this._canMove = false;

    if (dx < 0) this.player.setFlipX(true);
    else if (dx > 0) this.player.setFlipX(false);

    this.player.play('walk', true);

    this.tweens.add({
      targets:  this.player,
      x:        newCol * TILE + TILE / 2,
      y:        newRow * TILE + TILE / 2,
      duration: 150,
      ease:     'Linear',
      onComplete: () => {
        this.player.play('idle', true);
        this._canMove = true;
      },
    });
  }
}

new Phaser.Game({
  type:   Phaser.AUTO,
  width:  COLS * TILE,
  height: ROWS * TILE,
  backgroundColor: '#2d4a1e',
  scene:  [GameScene],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  banner: false,
});
