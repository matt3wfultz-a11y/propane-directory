// BugJar — simple tile map with walking character

const TILE   = 32;   // rendered tile size in pixels
const COLS   = 20;
const ROWS   = 15;

// Simple map: 0 = grass, 1 = dirt path, 2 = tree (wall)
const MAP = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2],
  [2,0,2,2,0,0,0,0,0,1,0,0,0,0,0,2,2,0,0,2],
  [2,0,2,2,0,0,0,0,0,1,0,0,0,0,0,2,2,0,0,2],
  [2,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,2],
  [2,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,2],
  [2,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,2],
  [2,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,2],
  [2,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2],
  [2,0,2,2,0,0,0,0,0,1,0,0,0,0,0,2,2,0,0,2],
  [2,0,2,2,0,0,0,0,0,1,0,0,0,0,0,2,2,0,0,2],
  [2,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

// Grass tile frames from the 16px tileset (frame = row*64 + col)
// Two alternating grass shades for the checkerboard look
const GRASS_A = 2;   // col 2, row 0 — lighter grass
const GRASS_B = 3;   // col 3, row 0 — slightly darker grass
const DIRT    = 66;  // col 2, row 1 — dirt path

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.spritesheet('tiles',
      'assets/Tileset/spr_tileset_sunnysideworld_16px.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    // Round trees from the Plants pack — 4-frame sway animation, 32×34px each
    this.load.spritesheet('tree1',
      'assets/Plants/spr_deco_tree_01_strip4.png',
      { frameWidth: 32, frameHeight: 34 }
    );
    // Tall pine trees — 4 frames, 28×43px each
    this.load.spritesheet('tree2',
      'assets/Plants/spr_deco_tree_02_strip4.png',
      { frameWidth: 28, frameHeight: 43 }
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
    // Tree sway animations
    this.anims.create({
      key: 'tree1_sway',
      frames: this.anims.generateFrameNumbers('tree1', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'tree2_sway',
      frames: this.anims.generateFrameNumbers('tree2', { start: 0, end: 3 }),
      frameRate: 3,
      repeat: -1,
    });

    // Draw tiles — ground layer first, then trees on top
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tileType = MAP[row][col];
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;

        if (tileType === 2) {
          // Grass under the tree
          const grassFrame = (row + col) % 2 === 0 ? GRASS_A : GRASS_B;
          this.add.image(x, y, 'tiles', grassFrame).setScale(2);

          // Alternate round vs pine trees across the map for variety
          const useRound = (row + col) % 3 !== 0;
          const key = useRound ? 'tree1' : 'tree2';
          const anim = useRound ? 'tree1_sway' : 'tree2_sway';
          // Stagger animation start so trees don't all sway in sync
          const offset = ((row * COLS + col) * 200) % 2000;
          this.time.delayedCall(offset, () => {
            this.add.sprite(x, y, key).setDepth(2).play(anim);
          });
        } else {
          // Checkerboard grass
          const grassFrame = (row + col) % 2 === 0 ? GRASS_A : GRASS_B;
          this.add.image(x, y, 'tiles', grassFrame).setScale(2);

          // Dirt path overlay
          if (tileType === 1) {
            this.add.image(x, y, 'tiles', DIRT).setScale(2).setDepth(1);
          }
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
      9 * TILE + TILE / 2,
      7 * TILE + TILE / 2,
      'player_idle'
    ).setScale(0.5).setDepth(10).play('idle');

    this._cell    = { col: 9, row: 7 };
    this._canMove = true;

    // Camera — 2× zoom, follows player, clamped to map
    this.cameras.main.setZoom(2);
    this.cameras.main.setBounds(0, 0, COLS * TILE, ROWS * TILE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    // Input
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  }

  update() {
    if (!this._canMove) return;

    const k = this.keys;
    let dx = 0, dy = 0;

    if      (k.A.isDown || k.LEFT.isDown)  dx = -1;
    else if (k.D.isDown || k.RIGHT.isDown) dx =  1;
    else if (k.W.isDown || k.UP.isDown)    dy = -1;
    else if (k.S.isDown || k.DOWN.isDown)  dy =  1;

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
