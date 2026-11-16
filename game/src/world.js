// Starlight Salvage — the simulation: game states, waves, movement,
// collisions, scoring and the combo chain. The renderer only reads this.

import { CONFIG } from './config.js';
import { rng } from './random.js';
import {
  makeShip, makeAsteroid, makeShard, makePickup, makeBullet, makeOrb,
  makeDrone, makeBoss, makeParticle, makeFloatText, explosionParticles,
  edgePoint,
} from './entities.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';

const TAU = Math.PI * 2;

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function wrap(v, max) {
  if (v < -80) return max + 70;
  if (v > max + 80) return -70;
  return v;
}

export class World {
  constructor(sound) {
    this.sound = sound;
    this.state = 'title'; // title | playing | upgrade | paused | over | victory
    this.ship = makeShip();
    this.asteroids = [];
    this.shards = [];
    this.pickups = [];
    this.bullets = [];
    this.orbs = [];
    this.drones = [];
    this.particles = [];
    this.floats = [];
    this.boss = null;
    this.score = 0;
    this.best = 0;
    this.wave = 0;
    this.quota = 0;       // shards collected this wave
    this.quotaTarget = 0; // shards needed to clear the wave
    this.combo = 0;
    this.comboTimer = 0;
    this.comboMax = CONFIG.combo.cap;
    this.upgradeChoices = [];
    this.time = 0;
    this.shake = 0;
    this.spawnTimer = 0;
    this.droneTimer = 0;
    this.kills = 0;
    this.shardsCollected = 0;
    this.stars = this._makeStars();
    this.message = '';
    this.messageTimer = 0;
    try {
      this.best = Number(window.localStorage.getItem('starlight-salvage-best') ?? 0) || 0;
    } catch {
      this.best = 0;
    }
  }

  _makeStars() {
    const layers = [];
    for (let layer = 0; layer < 3; layer += 1) {
      const stars = [];
      const count = [70, 45, 25][layer];
      for (let i = 0; i < count; i += 1) {
        stars.push({
          x: rng.range(0, CONFIG.width),
          y: rng.range(0, CONFIG.height),
          r: rng.range(0.6, 1.6 + layer * 0.5),
          tw: rng.range(0, TAU),
        });
      }
      layers.push(stars);
    }
    return layers;
  }

  get comboMultiplier() {
    return Math.min(1 + Math.floor(this.combo / 4), this.comboMax + this.ship.comboBonus);
  }

  get magnetRadius() {
    return CONFIG.shard.magnetRadius * (1 + this.ship.magnetBonus);
  }

  get fireRate() {
    return CONFIG.ship.fireRate * (1 + this.ship.fireRateBonus);
  }

  get bulletDamage() {
    return CONFIG.ship.bulletDamage + this.ship.damageBonus;
  }

  startGame() {
    this.ship = makeShip();
    this.asteroids = [];
    this.shards = [];
    this.pickups = [];
    this.bullets = [];
    this.orbs = [];
    this.drones = [];
    this.particles = [];
    this.floats = [];
    this.boss = null;
    this.score = 0;
    this.wave = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.shardsCollected = 0;
    this.shake = 0;
    this.nextWave();
    this.state = 'playing';
  }

  nextWave() {
    this.wave += 1;
    this.quota = 0;
    this.quotaTarget = CONFIG.waves.quotaBase + (this.wave - 1) * CONFIG.waves.quotaPerWave;
    this.spawnTimer = 0;
    this.droneTimer = 4;
    this.boss = null;
    if (CONFIG.waves.bossWaves.includes(this.wave)) {
      this.boss = makeBoss(this.wave);
      this.showMessage(`WAVE ${this.wave} — DREADNOUGHT APPROACHES`, 3);
    } else {
      this.showMessage(`WAVE ${this.wave} — COLLECT ${this.quotaTarget} SALVAGE`, 2.5);
    }
  }

  showMessage(text, seconds) {
    this.message = text;
    this.messageTimer = seconds;
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem('starlight-salvage-best', String(this.best));
      } catch {
        // Storage unavailable: best score just lives for this session.
      }
    }
  }

  gameOver() {
    this.state = 'over';
    this.saveBest();
    this.sound.gameOver();
    this.sound.stopMusic();
  }

  winGame() {
    this.state = 'victory';
    this.saveBest();
    this.sound.victory();
    this.sound.stopMusic();
  }

  // ---- combat helpers -------------------------------------------------

  fireBullet() {
    const s = this.ship;
    const spread = s.cannons === 2 ? 0.09 : 0;
    const offsets = s.cannons === 2 ? [-7, 7] : [0];
    for (const off of offsets) {
      const a = s.angle + (off === 0 ? 0 : (off < 0 ? -spread : spread));
      const px = s.x + Math.cos(s.angle) * 18 + Math.cos(s.angle + Math.PI / 2) * off;
      const py = s.y + Math.sin(s.angle) * 18 + Math.sin(s.angle + Math.PI / 2) * off;
      this.bullets.push(makeBullet(px, py, a, CONFIG.ship.bulletSpeed, this.bulletDamage, s.pierce));
    }
    s.fireCooldown = 1 / this.fireRate;
    this.sound.shoot();
  }

  damageShip(amount, fromX, fromY) {
    const s = this.ship;
    if (s.invuln > 0 || this.state !== 'playing') return;
    let rest = amount;
    if (s.shield > 0) {
      const absorbed = Math.min(s.shield, rest);
      s.shield -= absorbed;
      rest -= absorbed;
    }
    s.hull -= rest;
    s.invuln = CONFIG.ship.invulnTime;
    this.shake = Math.max(this.shake, 10);
    this.sound.hit();
    this.particles.push(...explosionParticles(rng, s.x, s.y, 14, ['#ffdd66', '#ff8844', '#ffffff']));
    if (fromX !== undefined) {
      const a = Math.atan2(s.y - fromY, s.x - fromX);
      s.vx += Math.cos(a) * 260;
      s.vy += Math.sin(a) * 260;
    }
    if (s.hull <= 0) {
      s.hull = 0;
      this.particles.push(...explosionParticles(rng, s.x, s.y, 60, ['#ffdd66', '#ff8844', '#ff4455', '#ffffff']));
      this.gameOver();
    }
  }

  breakAsteroid(ast, index) {
    this.asteroids.splice(index, 1);
    this.kills += 1;
    this.addScore(ast.score, ast.x, ast.y);
    this.sound.explode(ast.tier === 'large');
    this.particles.push(...explosionParticles(rng, ast.x, ast.y, ast.tier === 'large' ? 26 : 14,
      ['#c9a37e', '#8a6f55', '#e8d5b5', '#ffdd66']));
    for (let i = 0; i < ast.shards; i += 1) {
      this.shards.push(makeShard(rng, ast.x, ast.y, CONFIG.shard.value));
    }
    if (rng.chance(CONFIG.pickupChance)) {
      this.pickups.push(makePickup(rng, ast.x, ast.y, rng.chance(0.5) ? 'shield' : 'repair'));
    }
    // Split into smaller rocks.
    const next = ast.tier === 'large' ? 'medium' : ast.tier === 'medium' ? 'small' : null;
    if (next) {
      for (let i = 0; i < 2; i += 1) {
        const child = makeAsteroid(rng, next, ast.x, ast.y, this.wave);
        child.vx = ast.vx + rng.range(-70, 70);
        child.vy = ast.vy + rng.range(-70, 70);
        this.asteroids.push(child);
      }
    }
  }

  addScore(base, x, y) {
    const gained = base * this.comboMultiplier;
    this.score += gained;
    if (x !== undefined) {
      this.floats.push(makeFloatText(x, y, `+${gained}`, '#ffe066', gained >= 200 ? 20 : 15));
    }
  }

  collectShard(shard, index) {
    this.shards.splice(index, 1);
    this.combo += 1;
    this.comboTimer = CONFIG.combo.window + this.ship.comboBonus;
    const value = Math.round(shard.value * (1 + this.ship.shardBonus));
    this.addScore(value, shard.x, shard.y);
    this.quota += 1;
    this.shardsCollected += 1;
    this.sound.pickup(this.combo);
    if (this.quota >= this.quotaTarget && !this.boss) this.clearWave();
  }

  clearWave() {
    if (this.wave >= CONFIG.waves.finalWave) {
      this.winGame();
      return;
    }
    this.sound.waveClear();
    this.addScore(100 * this.wave);
    this.upgradeChoices = rollUpgrades(rng, this.ship, 3);
    this.state = 'upgrade';
  }

  chooseUpgrade(i) {
    const up = this.upgradeChoices[i];
    if (!up) return;
    applyUpgrade(this.ship, up);
    this.sound.upgrade();
    this.upgradeChoices = [];
    this.nextWave();
    this.state = 'playing';
  }

  // ---- per-frame update ------------------------------------------------

  update(dt, input) {
    this.time += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);

    // Particles and floating text always animate, even on menus.
    this._updateParticles(dt);
    this._updateFloats(dt);

    if (this.state === 'title') {
      this._updateTitleDrift(dt);
      if (input.pressed('enter', ' ') || input.mouse.clicked) {
        this.sound.unlock();
        this.sound.click();
        this.sound.startMusic();
        this.startGame();
      }
      return;
    }

    if (this.state === 'upgrade') {
      if (input.pressed('1')) this.chooseUpgrade(0);
      else if (input.pressed('2')) this.chooseUpgrade(1);
      else if (input.pressed('3')) this.chooseUpgrade(2);
      else if (input.mouse.clicked) {
        const hit = this.upgradeCardAt(input.mouse.x, input.mouse.y);
        if (hit >= 0) this.chooseUpgrade(hit);
      }
      return;
    }

    if (this.state === 'over' || this.state === 'victory') {
      if (input.pressed('enter', 'r', ' ') || input.mouse.clicked) {
        this.sound.click();
        this.startGame();
      }
      return;
    }

    if (this.state === 'paused') {
      if (input.pressed('p', 'escape', 'enter')) {
        this.state = 'playing';
        this.sound.click();
      }
      return;
    }

    // state === 'playing'
    if (input.pressed('p', 'escape')) {
      this.state = 'paused';
      this.sound.click();
      return;
    }
    if (input.pressed('m')) {
      this.sound.toggleMute();
    }

    const s = this.ship;
    // Aim at the mouse; thrust with WASD / arrows.
    s.angle = Math.atan2(input.mouse.y - s.y, input.mouse.x - s.x);
    let ax = 0;
    let ay = 0;
    if (input.down('w', 'arrowup')) ay -= 1;
    if (input.down('s', 'arrowdown')) ay += 1;
    if (input.down('a', 'arrowleft')) ax -= 1;
    if (input.down('d', 'arrowright')) ax += 1;
    const thrust = CONFIG.ship.thrust * (1 + s.thrustBonus);
    if (ax !== 0 || ay !== 0) {
      const len = Math.hypot(ax, ay);
      s.vx += (ax / len) * thrust * dt;
      s.vy += (ay / len) * thrust * dt;
      s.thrusting = true;
      if (rng.chance(0.5)) {
        this.particles.push(makeParticle(
          s.x - Math.cos(s.angle) * 16, s.y - Math.sin(s.angle) * 16,
          -s.vx * 0.15 + rng.range(-20, 20), -s.vy * 0.15 + rng.range(-20, 20),
          0.35, 3, rng.pick(['#ffb347', '#ff7b2f', '#ffe066']),
        ));
      }
    } else {
      s.thrusting = false;
    }
    const drag = Math.pow(CONFIG.ship.drag, dt * 10);
    s.vx *= drag;
    s.vy *= drag;
    const speed = Math.hypot(s.vx, s.vy);
    const maxSpeed = CONFIG.ship.maxSpeed * (1 + s.thrustBonus);
    if (speed > maxSpeed) {
      s.vx = (s.vx / speed) * maxSpeed;
      s.vy = (s.vy / speed) * maxSpeed;
    }
    s.x = wrap(s.x + s.vx * dt, CONFIG.width);
    s.y = wrap(s.y + s.vy * dt, CONFIG.height);
    if (s.invuln > 0) s.invuln -= dt;
    if (s.regen > 0 && s.hull < s.maxHull) s.hull = Math.min(s.maxHull, s.hull + s.regen * dt);
    if (s.shieldRegen > 0 && s.shield < s.maxShield) {
      s.shield = Math.min(s.maxShield, s.shield + s.shieldRegen * dt);
    }

    // Fire with mouse held or Space.
    s.fireCooldown -= dt;
    if ((input.mouse.down || input.down(' ')) && s.fireCooldown <= 0) this.fireBullet();

    // Combo decay.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this._updateAsteroids(dt);
    this._updateDrones(dt);
    this._updateBoss(dt);
    this._updateBullets(dt);
    this._updateOrbs(dt);
    this._updateShards(dt);
    this._updatePickups(dt);
    this._updateSpawning(dt);
  }

  _updateTitleDrift(dt) {
    for (const a of this.asteroids) {
      a.x = wrap(a.x + a.vx * dt, CONFIG.width);
      a.y = wrap(a.y + a.vy * dt, CONFIG.height);
      a.angle += a.spin * dt;
    }
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _updateFloats(dt) {
    for (let i = this.floats.length - 1; i >= 0; i -= 1) {
      const f = this.floats[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floats.splice(i, 1);
    }
  }

  _updateAsteroids(dt) {
    const s = this.ship;
    for (let i = this.asteroids.length - 1; i >= 0; i -= 1) {
      const a = this.asteroids[i];
      a.x = wrap(a.x + a.vx * dt, CONFIG.width);
      a.y = wrap(a.y + a.vy * dt, CONFIG.height);
      a.angle += a.spin * dt;
      if (a.flash > 0) a.flash -= dt;
      // Ship collision.
      const rr = a.radius + s.radius;
      if (dist2(a, s) < rr * rr) {
        this.breakAsteroid(a, i);
        this.damageShip(a.tier === 'large' ? 22 : a.tier === 'medium' ? 16 : 10, a.x, a.y);
      }
    }
  }

  _updateDrones(dt) {
    const s = this.ship;
    for (let i = this.drones.length - 1; i >= 0; i -= 1) {
      const d = this.drones[i];
      const a = Math.atan2(s.y - d.y, s.x - d.x);
      d.angle = a;
      d.vx += Math.cos(a) * CONFIG.drone.speed * dt * 2;
      d.vy += Math.sin(a) * CONFIG.drone.speed * dt * 2;
      const sp = Math.hypot(d.vx, d.vy);
      if (sp > CONFIG.drone.speed) {
        d.vx = (d.vx / sp) * CONFIG.drone.speed;
        d.vy = (d.vy / sp) * CONFIG.drone.speed;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.flash > 0) d.flash -= dt;
      d.fireTimer -= dt;
      if (d.fireTimer <= 0) {
        d.fireTimer = CONFIG.drone.fireInterval;
        this.orbs.push(makeOrb(d.x, d.y, a, CONFIG.drone.orbSpeed));
        this.sound.enemyShoot();
      }
      const rr = d.radius + s.radius;
      if (dist2(d, s) < rr * rr) {
        this.damageShip(14, d.x, d.y);
        this.drones.splice(i, 1);
        this.particles.push(...explosionParticles(rng, d.x, d.y, 20, ['#ff5566', '#ffdd66', '#ffffff']));
      }
    }
  }

  _updateBoss(dt) {
    const b = this.boss;
    if (!b) return;
    const s = this.ship;
    if (b.state === 'enter') {
      b.y += 60 * dt;
      if (b.y >= 110) {
        b.y = 110;
        b.state = 'fight';
        this.showMessage('DESTROY THE DREADNOUGHT', 2.5);
      }
      return;
    }
    // Strafe across the top, tracking the ship.
    const targetX = CONFIG.width / 2 + Math.sin(this.time * 0.45) * 420;
    b.vx = (targetX - b.x) * 0.8;
    b.x += b.vx * dt;
    b.angle = Math.atan2(s.y - b.y, s.x - b.x);
    if (b.flash > 0) b.flash -= dt;
    b.fireTimer -= dt;
    if (b.fireTimer <= 0) {
      b.fireTimer = CONFIG.boss.fireInterval;
      const base = Math.atan2(s.y - b.y, s.x - b.x);
      for (const off of [-0.16, 0, 0.16]) {
        this.orbs.push(makeOrb(b.x, b.y + 30, base + off, CONFIG.boss.orbSpeed));
      }
      this.sound.enemyShoot();
    }
    const rr = b.radius + s.radius;
    if (dist2(b, s) < rr * rr) this.damageShip(26, b.x, b.y);
  }

  _updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > CONFIG.width + 20 || b.y < -20 || b.y > CONFIG.height + 20) {
        this.bullets.splice(i, 1);
        continue;
      }
      // Hit asteroids.
      let consumed = false;
      for (let j = this.asteroids.length - 1; j >= 0; j -= 1) {
        const a = this.asteroids[j];
        const rr = a.radius + b.radius;
        if (dist2(b, a) < rr * rr) {
          a.hits -= b.damage;
          a.flash = 0.12;
          this.particles.push(...explosionParticles(rng, b.x, b.y, 5, ['#ffe066', '#ffffff']));
          if (a.hits <= 0) this.breakAsteroid(a, j);
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            consumed = true;
          }
          break;
        }
      }
      if (consumed) {
        this.bullets.splice(i, 1);
        continue;
      }
      // Hit drones.
      for (let j = this.drones.length - 1; j >= 0; j -= 1) {
        const d = this.drones[j];
        const rr = d.radius + b.radius;
        if (dist2(b, d) < rr * rr) {
          d.hull -= b.damage;
          d.flash = 0.12;
          if (d.hull <= 0) {
            this.drones.splice(j, 1);
            this.kills += 1;
            this.addScore(CONFIG.drone.score, d.x, d.y);
            this.sound.explode(false);
            this.particles.push(...explosionParticles(rng, d.x, d.y, 22, ['#ff5566', '#ffdd66', '#ffffff']));
            for (let k = 0; k < 3; k += 1) this.shards.push(makeShard(rng, d.x, d.y, CONFIG.shard.value));
          }
          if (b.pierce > 0) b.pierce -= 1;
          else consumed = true;
          break;
        }
      }
      if (consumed) {
        this.bullets.splice(i, 1);
        continue;
      }
      // Hit the boss.
      if (this.boss && this.boss.state === 'fight') {
        const boss = this.boss;
        const rr = boss.radius + b.radius;
        if (dist2(b, boss) < rr * rr) {
          boss.hull -= b.damage;
          boss.flash = 0.1;
          this.particles.push(...explosionParticles(rng, b.x, b.y, 4, ['#ffe066', '#ffffff']));
          if (boss.hull <= 0) {
            this.boss = null;
            this.kills += 1;
            this.addScore(CONFIG.boss.score, boss.x, boss.y);
            this.sound.explode(true);
            this.particles.push(...explosionParticles(rng, boss.x, boss.y, 70, ['#ff5566', '#ffdd66', '#ff8844', '#ffffff']));
            this.shake = 18;
            for (let k = 0; k < 12; k += 1) this.shards.push(makeShard(rng, boss.x, boss.y, CONFIG.shard.value));
            this.clearWave();
          }
          if (b.pierce > 0) b.pierce -= 1;
          else this.bullets.splice(i, 1);
        }
      }
    }
  }

  _updateOrbs(dt) {
    const s = this.ship;
    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      const o = this.orbs[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      if (o.life <= 0 || o.x < -20 || o.x > CONFIG.width + 20 || o.y < -20 || o.y > CONFIG.height + 20) {
        this.orbs.splice(i, 1);
        continue;
      }
      const rr = o.radius + s.radius;
      if (dist2(o, s) < rr * rr) {
        this.orbs.splice(i, 1);
        this.damageShip(10, o.x, o.y);
      }
    }
  }

  _updateShards(dt) {
    const s = this.ship;
    const magnetR = this.magnetRadius;
    for (let i = this.shards.length - 1; i >= 0; i -= 1) {
      const sh = this.shards[i];
      sh.life -= dt;
      if (sh.life <= 0) {
        this.shards.splice(i, 1);
        continue;
      }
      const dx = s.x - sh.x;
      const dy = s.y - sh.y;
      const d = Math.hypot(dx, dy);
      if (d < magnetR) {
        sh.vx += (dx / (d || 1)) * CONFIG.shard.magnetPull * dt;
        sh.vy += (dy / (d || 1)) * CONFIG.shard.magnetPull * dt;
      }
      sh.vx *= 0.99;
      sh.vy *= 0.99;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      if (d < s.radius + sh.radius + 4) this.collectShard(sh, i);
    }
  }

  _updatePickups(dt) {
    const s = this.ship;
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const p = this.pickups[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }
      p.x = wrap(p.x + p.vx * dt, CONFIG.width);
      p.y = wrap(p.y + p.vy * dt, CONFIG.height);
      const rr = p.radius + s.radius;
      if (dist2(p, s) < rr * rr) {
        this.pickups.splice(i, 1);
        if (p.type === 'shield') {
          s.shield = Math.min(s.maxShield || 25, (s.shield || 0) + 25);
          if (s.maxShield === 0) s.maxShield = 25;
          this.floats.push(makeFloatText(s.x, s.y - 30, '+SHIELD', '#66ccff', 16));
        } else {
          s.hull = Math.min(s.maxHull, s.hull + 25);
          this.floats.push(makeFloatText(s.x, s.y - 30, '+25 HULL', '#66ff99', 16));
        }
        this.sound.powerup();
      }
    }
  }

  _updateSpawning(dt) {
    // Keep the field populated up to the wave's asteroid cap.
    const cap = Math.min(
      CONFIG.waves.asteroidsBase + (this.wave - 1) * CONFIG.waves.asteroidsPerWave,
      CONFIG.waves.asteroidsCap,
    );
    this.spawnTimer -= dt;
    if (this.asteroids.length < cap && this.spawnTimer <= 0) {
      this.spawnTimer = 1.1;
      const p = edgePoint(rng);
      this.asteroids.push(makeAsteroid(rng, 'large', p.x, p.y, this.wave));
    }
    // Raiders from wave 3 on.
    if (this.wave >= CONFIG.waves.droneFromWave) {
      const droneCap = Math.min((this.wave - 2) * CONFIG.waves.dronesPerWave, CONFIG.waves.dronesCap);
      this.droneTimer -= dt;
      if (this.drones.length < droneCap && this.droneTimer <= 0) {
        this.droneTimer = 5;
        this.drones.push(makeDrone(rng, this.wave));
      }
    }
  }

  /** Screen rect of upgrade card `i` (shared with the renderer). */
  upgradeCardAt(x, y) {
    const cardW = 300;
    const cardH = 210;
    const gap = 36;
    const total = this.upgradeChoices.length * cardW + (this.upgradeChoices.length - 1) * gap;
    const x0 = (CONFIG.width - total) / 2;
    const y0 = 300;
    for (let i = 0; i < this.upgradeChoices.length; i += 1) {
      const cx = x0 + i * (cardW + gap);
      if (x >= cx && x <= cx + cardW && y >= y0 && y <= y0 + cardH) return i;
    }
    return -1;
  }
}
