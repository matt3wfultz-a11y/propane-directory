// moves.js — static move definitions

'use strict';

// category: 'physical' | 'special' | 'status'
// effect: null | { type, stat?, stages?, target, chance? }
//   types: 'statDebuff', 'statBuff', 'burn', 'paralyze', 'poison'
//   target: 'enemy' | 'self'

const MOVES = {
  // ── Fire ──────────────────────────────────────────────────────────────────
  EMBER: {
    id: 'EMBER', name: 'Ember', type: 'Fire',
    category: 'physical', power: 40, accuracy: 0.95, pp: 25,
    effect: { type: 'burn', chance: 0.1, target: 'enemy' },
    description: 'A small burst of fire. May burn.',
  },
  SCORCH: {
    id: 'SCORCH', name: 'Scorch', type: 'Fire',
    category: 'physical', power: 70, accuracy: 0.85, pp: 15,
    effect: null,
    description: 'An intense scorching blast.',
  },
  FLAME_GLAND: {
    id: 'FLAME_GLAND', name: 'Flame Gland', type: 'Fire',
    category: 'special', power: 55, accuracy: 0.90, pp: 20,
    effect: { type: 'statDebuff', stat: 'def', stages: -1, target: 'enemy', chance: 0.3 },
    description: 'Sprays burning fluid. May lower defense.',
  },
  HEAT_PULSE: {
    id: 'HEAT_PULSE', name: 'Heat Pulse', type: 'Fire',
    category: 'special', power: 90, accuracy: 0.80, pp: 10,
    effect: null,
    description: 'A powerful heat wave.',
  },

  // ── Poison ────────────────────────────────────────────────────────────────
  SLIME: {
    id: 'SLIME', name: 'Slime', type: 'Poison',
    category: 'physical', power: 35, accuracy: 1.0, pp: 30,
    effect: { type: 'poison', chance: 0.2, target: 'enemy' },
    description: 'A gooey glob. May poison.',
  },
  ACID_SPIT: {
    id: 'ACID_SPIT', name: 'Acid Spit', type: 'Poison',
    category: 'special', power: 60, accuracy: 0.90, pp: 15,
    effect: { type: 'statDebuff', stat: 'def', stages: -1, target: 'enemy', chance: 0.5 },
    description: 'Corrodes armor. Often lowers defense.',
  },
  BLOAT: {
    id: 'BLOAT', name: 'Bloat', type: 'Poison',
    category: 'status', power: 0, accuracy: 0.85, pp: 20,
    effect: { type: 'poison', chance: 1.0, target: 'enemy' },
    description: 'Guarantees poison if it hits.',
  },
  TOXIC_CLOUD: {
    id: 'TOXIC_CLOUD', name: 'Toxic Cloud', type: 'Poison',
    category: 'special', power: 80, accuracy: 0.85, pp: 10,
    effect: null,
    description: 'Releases a noxious cloud.',
  },

  // ── Electric ──────────────────────────────────────────────────────────────
  STATIC_SNAP: {
    id: 'STATIC_SNAP', name: 'Static Snap', type: 'Electric',
    category: 'physical', power: 40, accuracy: 1.0, pp: 30,
    effect: { type: 'paralyze', chance: 0.1, target: 'enemy' },
    description: 'A static discharge. May paralyze.',
  },
  VOLTBITE: {
    id: 'VOLTBITE', name: 'Voltbite', type: 'Electric',
    category: 'physical', power: 65, accuracy: 0.90, pp: 20,
    effect: null,
    description: 'Bites with electrically charged mandibles.',
  },
  ANTENNA_BEAM: {
    id: 'ANTENNA_BEAM', name: 'Antenna Beam', type: 'Electric',
    category: 'special', power: 75, accuracy: 0.85, pp: 15,
    effect: { type: 'paralyze', chance: 0.3, target: 'enemy' },
    description: 'Fires a beam from antennae. May paralyze.',
  },
  THUNDERSWARM: {
    id: 'THUNDERSWARM', name: 'Thunderswarm', type: 'Electric',
    category: 'special', power: 95, accuracy: 0.75, pp: 10,
    effect: null,
    description: 'Unleashes a storm of electric charges.',
  },

  // ── Rock ──────────────────────────────────────────────────────────────────
  SHELL_BASH: {
    id: 'SHELL_BASH', name: 'Shell Bash', type: 'Rock',
    category: 'physical', power: 50, accuracy: 1.0, pp: 25,
    effect: null,
    description: 'Rams with the armored shell.',
  },
  ROCKSLAM: {
    id: 'ROCKSLAM', name: 'Rockslam', type: 'Rock',
    category: 'physical', power: 75, accuracy: 0.85, pp: 15,
    effect: { type: 'statDebuff', stat: 'spd', stages: -1, target: 'enemy', chance: 0.3 },
    description: 'A crushing blow. May slow the target.',
  },
  CARAPACE_HARDEN: {
    id: 'CARAPACE_HARDEN', name: 'Carapace Harden', type: 'Rock',
    category: 'status', power: 0, accuracy: 1.0, pp: 20,
    effect: { type: 'statBuff', stat: 'def', stages: 2, target: 'self', chance: 1.0 },
    description: 'Hardens the carapace. Sharply raises defense.',
  },
  BOULDER_ROLL: {
    id: 'BOULDER_ROLL', name: 'Boulder Roll', type: 'Rock',
    category: 'physical', power: 100, accuracy: 0.75, pp: 8,
    effect: null,
    description: 'Curls into a ball and smashes full force.',
  },

  // ── Water ─────────────────────────────────────────────────────────────────
  MIST_SPRAY: {
    id: 'MIST_SPRAY', name: 'Mist Spray', type: 'Water',
    category: 'special', power: 40, accuracy: 1.0, pp: 30,
    effect: null,
    description: 'A fine spray of water.',
  },
  WING_WASH: {
    id: 'WING_WASH', name: 'Wing Wash', type: 'Water',
    category: 'special', power: 60, accuracy: 0.90, pp: 20,
    effect: null,
    description: 'Drenches the foe with flapping wings.',
  },
  DEWDROP: {
    id: 'DEWDROP', name: 'Dewdrop', type: 'Water',
    category: 'status', power: 0, accuracy: 1.0, pp: 20,
    effect: { type: 'statBuff', stat: 'spd', stages: 1, target: 'self', chance: 1.0 },
    description: 'Absorbs dew to boost speed.',
  },
  TORRENT: {
    id: 'TORRENT', name: 'Torrent', type: 'Water',
    category: 'special', power: 90, accuracy: 0.80, pp: 10,
    effect: null,
    description: 'A powerful surge of water.',
  },

  // ── Grass ─────────────────────────────────────────────────────────────────
  THORN_JAB: {
    id: 'THORN_JAB', name: 'Thorn Jab', type: 'Grass',
    category: 'physical', power: 45, accuracy: 1.0, pp: 25,
    effect: { type: 'poison', chance: 0.2, target: 'enemy' },
    description: 'Stabs with thorns. May poison.',
  },
  SPORE_PUFF: {
    id: 'SPORE_PUFF', name: 'Spore Puff', type: 'Grass',
    category: 'status', power: 0, accuracy: 0.85, pp: 20,
    effect: { type: 'statDebuff', stat: 'atk', stages: -1, target: 'enemy', chance: 1.0 },
    description: 'Releases spores that lower attack.',
  },
  VINE_WHIP: {
    id: 'VINE_WHIP', name: 'Vine Whip', type: 'Grass',
    category: 'physical', power: 65, accuracy: 0.95, pp: 18,
    effect: null,
    description: 'Lashes out with a thorny vine.',
  },
  LEAF_STORM: {
    id: 'LEAF_STORM', name: 'Leaf Storm', type: 'Grass',
    category: 'special', power: 95, accuracy: 0.80, pp: 10,
    effect: { type: 'statDebuff', stat: 'atk', stages: -2, target: 'self', chance: 1.0 },
    description: 'Massive storm of razor leaves. Lowers own attack.',
  },

  // ── Ice ───────────────────────────────────────────────────────────────────
  FROST_BITE: {
    id: 'FROST_BITE', name: 'Frost Bite', type: 'Ice',
    category: 'physical', power: 55, accuracy: 0.95, pp: 20,
    effect: { type: 'statDebuff', stat: 'spd', stages: -1, target: 'enemy', chance: 0.3 },
    description: 'Bites with icy mandibles. May slow.',
  },
  CRYSTAL_WING: {
    id: 'CRYSTAL_WING', name: 'Crystal Wing', type: 'Ice',
    category: 'physical', power: 70, accuracy: 0.90, pp: 15,
    effect: null,
    description: 'Slashes with razor-sharp ice wings.',
  },
  COLD_SNAP: {
    id: 'COLD_SNAP', name: 'Cold Snap', type: 'Ice',
    category: 'special', power: 85, accuracy: 0.85, pp: 12,
    effect: null,
    description: 'A sudden blast of freezing air.',
  },
  BLIZZARD_HORN: {
    id: 'BLIZZARD_HORN', name: 'Blizzard Horn', type: 'Ice',
    category: 'physical', power: 110, accuracy: 0.70, pp: 8,
    effect: null,
    description: 'Charges with an ice-encrusted horn. Devastating but inaccurate.',
  },

  // ── Flying ────────────────────────────────────────────────────────────────
  GUST: {
    id: 'GUST', name: 'Gust', type: 'Flying',
    category: 'special', power: 40, accuracy: 1.0, pp: 30,
    effect: null,
    description: 'A flap of the wings creates wind.',
  },
  DIVE_STRIKE: {
    id: 'DIVE_STRIKE', name: 'Dive Strike', type: 'Flying',
    category: 'physical', power: 70, accuracy: 0.90, pp: 15,
    effect: null,
    description: 'Dives from above at great speed.',
  },
  UPDRAFT: {
    id: 'UPDRAFT', name: 'Updraft', type: 'Flying',
    category: 'status', power: 0, accuracy: 1.0, pp: 20,
    effect: { type: 'statBuff', stat: 'spd', stages: 2, target: 'self', chance: 1.0 },
    description: 'Catches a thermal. Sharply raises speed.',
  },
  WING_STORM: {
    id: 'WING_STORM', name: 'Wing Storm', type: 'Flying',
    category: 'special', power: 100, accuracy: 0.75, pp: 8,
    effect: null,
    description: 'Creates a powerful hurricane with wings.',
  },

  // ── Dark ──────────────────────────────────────────────────────────────────
  BURROW: {
    id: 'BURROW', name: 'Burrow', type: 'Dark',
    category: 'physical', power: 50, accuracy: 0.95, pp: 25,
    effect: null,
    description: 'Ambushes from underground.',
  },
  VOID_BITE: {
    id: 'VOID_BITE', name: 'Void Bite', type: 'Dark',
    category: 'physical', power: 65, accuracy: 0.90, pp: 20,
    effect: { type: 'statDebuff', stat: 'def', stages: -1, target: 'enemy', chance: 0.2 },
    description: 'Bites from the darkness. May lower defense.',
  },
  SHADOW_COIL: {
    id: 'SHADOW_COIL', name: 'Shadow Coil', type: 'Dark',
    category: 'status', power: 0, accuracy: 1.0, pp: 15,
    effect: { type: 'statBuff', stat: 'atk', stages: 2, target: 'self', chance: 1.0 },
    description: 'Coils in shadow, sharply raises attack.',
  },
  ABYSS_STRIKE: {
    id: 'ABYSS_STRIKE', name: 'Abyss Strike', type: 'Dark',
    category: 'physical', power: 95, accuracy: 0.80, pp: 10,
    effect: null,
    description: 'Strikes from the deepest darkness.',
  },

  // ── Light ─────────────────────────────────────────────────────────────────
  GLIMMER: {
    id: 'GLIMMER', name: 'Glimmer', type: 'Light',
    category: 'special', power: 40, accuracy: 1.0, pp: 30,
    effect: { type: 'statDebuff', stat: 'atk', stages: -1, target: 'enemy', chance: 0.2 },
    description: 'A dazzling flash. May lower attack.',
  },
  LUMEN_STRIKE: {
    id: 'LUMEN_STRIKE', name: 'Lumen Strike', type: 'Light',
    category: 'special', power: 75, accuracy: 0.90, pp: 15,
    effect: null,
    description: 'A focused beam of bioluminescent light.',
  },
  RADIATE: {
    id: 'RADIATE', name: 'Radiate', type: 'Light',
    category: 'status', power: 0, accuracy: 1.0, pp: 15,
    effect: { type: 'statBuff', stat: 'def', stages: 1, target: 'self', chance: 1.0 },
    description: 'Radiates light energy to boost defense.',
  },
  SOLAR_BURST: {
    id: 'SOLAR_BURST', name: 'Solar Burst', type: 'Light',
    category: 'special', power: 110, accuracy: 0.75, pp: 8,
    effect: null,
    description: 'Channels all bioluminescence into one devastating blast.',
  },

  // ── Normal (universal) ────────────────────────────────────────────────────
  SCRATCH: {
    id: 'SCRATCH', name: 'Scratch', type: 'Normal',
    category: 'physical', power: 35, accuracy: 1.0, pp: 35,
    effect: null,
    description: 'A basic scratch.',
  },
  STINGER: {
    id: 'STINGER', name: 'Stinger', type: 'Normal',
    category: 'physical', power: 50, accuracy: 1.0, pp: 25,
    effect: { type: 'poison', chance: 0.3, target: 'enemy' },
    description: 'Jabs with the stinger. Requires Stinger trait. May poison.',
    requiresTrait: 'D', // only usable if stinger phenotype is dominant
  },
  HARDEN: {
    id: 'HARDEN', name: 'Harden', type: 'Normal',
    category: 'status', power: 0, accuracy: 1.0, pp: 30,
    effect: { type: 'statBuff', stat: 'def', stages: 1, target: 'self', chance: 1.0 },
    description: 'Tenses the body to raise defense.',
  },
  TACKLE: {
    id: 'TACKLE', name: 'Tackle', type: 'Normal',
    category: 'physical', power: 40, accuracy: 1.0, pp: 35,
    effect: null,
    description: 'A basic full-body tackle.',
  },
};
