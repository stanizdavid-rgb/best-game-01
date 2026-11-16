// Starlight Salvage — tuning constants. One place for every number that
// shapes how the game feels, so balance can be adjusted without hunting
// through the simulation code.

export const CONFIG = {
  width: 1280,
  height: 720,

  ship: {
    radius: 15,
    thrust: 460,        // acceleration px/s^2
    maxSpeed: 360,
    drag: 0.9,          // velocity retained per second (exponential)
    hull: 100,
    fireRate: 6.5,      // shots per second
    bulletSpeed: 640,
    bulletDamage: 1,
    bulletLife: 0.9,    // seconds
    invulnTime: 1.2,    // seconds of mercy after a hit
  },

  asteroid: {
    // size tiers: [radius, hits, score, shards dropped]
    large:  { radius: 52, hits: 3, score: 40,  shards: 5 },
    medium: { radius: 32, hits: 2, score: 25,  shards: 3 },
    small:  { radius: 18, hits: 1, score: 15,  shards: 2 },
    baseSpeed: 46,
    speedPerWave: 6,
    spin: 1.4,
  },

  shard: {
    radius: 7,
    value: 10,          // base score per shard
    magnetRadius: 110,  // px: shards inside this drift toward the ship
    magnetPull: 520,    // acceleration toward the ship
    life: 14,           // seconds before a shard fades
  },

  drone: {
    radius: 16,
    hull: 2,
    speed: 150,
    fireInterval: 2.4,  // seconds between shots
    orbSpeed: 220,
    score: 60,
  },

  boss: {
    radius: 74,
    hull: 120,
    speed: 70,
    fireInterval: 1.1,
    orbSpeed: 260,
    score: 1500,
  },

  combo: {
    window: 4,          // seconds to keep the chain alive
    cap: 8,             // max multiplier
  },

  waves: {
    quotaBase: 10,      // shards needed to clear wave 1
    quotaPerWave: 6,    // extra shards per wave
    asteroidsBase: 5,   // concurrent asteroids, wave 1
    asteroidsPerWave: 1,
    asteroidsCap: 14,
    droneFromWave: 3,
    dronesPerWave: 1,
    dronesCap: 4,
    bossWaves: [5, 10],
    finalWave: 10,
  },

  // Chance an asteroid drops a bonus pickup (shield cell / repair kit).
  pickupChance: 0.08,
};
