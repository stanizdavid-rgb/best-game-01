// Starlight Salvage — factories for every thing that flies, drifts or
// explodes. Entities are plain objects; the world updates them, the
// renderer draws them.

import { CONFIG } from './config.js';

export function makeShip() {
  return {
    kind: 'ship',
    x: CONFIG.width / 2,
    y: CONFIG.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // nose up
    radius: CONFIG.ship.radius,
    hull: CONFIG.ship.hull,
    maxHull: CONFIG.ship.hull,
    shield: 0,
    maxShield: 0,
    shieldRegen: 0, // per second
    thrusting: false,
    invuln: 0,
    fireCooldown: 0,
    regen: 0, // hull per second (Repair Drone upgrade)
    // Upgrade levels, shown on the upgrade screen and in the HUD tooltip.
    upgrades: {},
    magnetBonus: 0,
    fireRateBonus: 0,
    damageBonus: 0,
    cannons: 1,
    pierce: 0,
    shardBonus: 0,
    comboBonus: 0,
    thrustBonus: 0,
  };
}

function rockShape(rng, radius) {
  const points = [];
  const count = 9 + rng.int(0, 3);
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const r = radius * rng.range(0.72, 1.12);
    points.push({ a, r });
  }
  return points;
}

export function makeAsteroid(rng, tier, x, y, wave) {
  const spec = CONFIG.asteroid[tier];
  const speed = CONFIG.asteroid.baseSpeed + wave * CONFIG.asteroid.speedPerWave;
  const angle = rng.angle();
  const v = speed * rng.range(0.5, 1.3);
  return {
    kind: 'asteroid',
    tier,
    x,
    y,
    vx: Math.cos(angle) * v,
    vy: Math.sin(angle) * v,
    radius: spec.radius,
    hits: spec.hits,
    maxHits: spec.hits,
    score: spec.score,
    shards: spec.shards,
    angle: rng.angle(),
    spin: rng.range(-CONFIG.asteroid.spin, CONFIG.asteroid.spin),
    shape: rockShape(rng, spec.radius),
    craters: Array.from({ length: 3 }, () => ({
      a: rng.angle(),
      d: rng.range(0.2, 0.6),
      r: rng.range(0.08, 0.18),
    })),
    flash: 0,
  };
}

/** A point just outside a random screen edge, for spawning asteroids. */
export function edgePoint(rng) {
  const m = 70;
  const side = rng.int(0, 3);
  if (side === 0) return { x: rng.range(0, CONFIG.width), y: -m };
  if (side === 1) return { x: rng.range(0, CONFIG.width), y: CONFIG.height + m };
  if (side === 2) return { x: -m, y: rng.range(0, CONFIG.height) };
  return { x: CONFIG.width + m, y: rng.range(0, CONFIG.height) };
}

export function makeShard(rng, x, y, value) {
  const a = rng.angle();
  const v = rng.range(40, 140);
  return {
    kind: 'shard',
    x,
    y,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    radius: CONFIG.shard.radius,
    value,
    life: CONFIG.shard.life,
    phase: rng.range(0, Math.PI * 2),
  };
}

export function makePickup(rng, x, y, type) {
  return {
    kind: 'pickup',
    type, // 'shield' | 'repair'
    x,
    y,
    vx: rng.range(-30, 30),
    vy: rng.range(-30, 30),
    radius: 12,
    life: 12,
    phase: rng.range(0, Math.PI * 2),
  };
}

export function makeBullet(x, y, angle, speed, damage, pierce) {
  return {
    kind: 'bullet',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 4,
    damage,
    pierce,
    life: CONFIG.ship.bulletLife,
  };
}

export function makeOrb(x, y, angle, speed) {
  return {
    kind: 'orb',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 6,
    life: 5,
  };
}

export function makeDrone(rng, wave) {
  const p = edgePoint(rng);
  return {
    kind: 'drone',
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    radius: CONFIG.drone.radius,
    hull: CONFIG.drone.hull + Math.floor(wave / 4),
    fireTimer: rng.range(1, 2.4),
    angle: 0,
    flash: 0,
  };
}

export function makeBoss(wave) {
  return {
    kind: 'boss',
    x: CONFIG.width / 2,
    y: -90,
    vx: 0,
    vy: 0,
    radius: CONFIG.boss.radius,
    hull: CONFIG.boss.hull + (wave - 5) * 20,
    maxHull: CONFIG.boss.hull + (wave - 5) * 20,
    fireTimer: 2,
    burst: 0,
    angle: Math.PI / 2,
    flash: 0,
    state: 'enter', // enter -> fight
  };
}

export function makeParticle(x, y, vx, vy, life, size, color) {
  return { kind: 'particle', x, y, vx, vy, life, maxLife: life, size, color };
}

export function makeFloatText(x, y, text, color, size = 16) {
  return { kind: 'floatText', x, y, text, color, size, life: 1.1, maxLife: 1.1 };
}

/** Burst of sparks/debris for an explosion. */
export function explosionParticles(rng, x, y, count, colors) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const a = rng.angle();
    const v = rng.range(30, 320);
    out.push(makeParticle(
      x, y,
      Math.cos(a) * v, Math.sin(a) * v,
      rng.range(0.4, 1.0),
      rng.range(2, 5),
      rng.pick(colors),
    ));
  }
  return out;
}
