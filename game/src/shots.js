// Starlight Salvage — staged states for screenshots. A URL like
// ?shot=play&seed=7 puts the game into a fixed, lively scene so the
// screenshots show the real game (title, play, upgrade, game over) at its
// best. Nothing here changes how the live game plays.

import { CONFIG } from './config.js';
import { Rng } from './random.js';
import { makeAsteroid, makeShard, makeDrone, makeBoss } from './entities.js';
import { rollUpgrades } from './upgrades.js';

function scatterAsteroids(world, rng, count) {
  world.asteroids = [];
  for (let i = 0; i < count; i += 1) {
    const tier = rng.pick(['large', 'large', 'medium', 'small']);
    world.asteroids.push(makeAsteroid(
      rng, tier,
      rng.range(80, CONFIG.width - 80),
      rng.range(110, CONFIG.height - 90),
      world.wave,
    ));
  }
}

function scatterShards(world, rng, count) {
  world.shards = [];
  for (let i = 0; i < count; i += 1) {
    world.shards.push(makeShard(
      rng,
      rng.range(120, CONFIG.width - 120),
      rng.range(130, CONFIG.height - 100),
      CONFIG.shard.value,
    ));
  }
}

export function setupShot(world, name, seed) {
  const rng = new Rng(seed);
  world.best = 2480;
  if (name === 'start') {
    world.state = 'title';
    world.wave = 0;
    scatterAsteroids(world, rng, 7);
    return;
  }
  if (name === 'play') {
    world.startGame();
    world.wave = 3;
    world.score = 1840;
    world.quota = 9;
    world.quotaTarget = 22;
    world.combo = 7;
    world.comboTimer = 3.2;
    world.ship.x = CONFIG.width / 2 - 60;
    world.ship.y = CONFIG.height / 2 + 40;
    world.ship.angle = -0.5;
    world.ship.hull = 74;
    world.ship.shield = 18;
    world.ship.maxShield = 25;
    world.ship.shieldRegen = 4;
    world.ship.upgrades = { rapid: 1, magnet: 1 };
    world.ship.fireRateBonus = 0.3;
    world.ship.magnetBonus = 0.6;
    scatterAsteroids(world, rng, 9);
    scatterShards(world, rng, 12);
    world.drones.push(makeDrone(rng, 3));
    world.drones[0].x = 980;
    world.drones[0].y = 200;
    world.bullets.push({
      kind: 'bullet', x: world.ship.x + 120, y: world.ship.y - 40,
      vx: 560, vy: -220, radius: 4, damage: 1, pierce: 0, life: 0.8,
    });
    world.bullets.push({
      kind: 'bullet', x: world.ship.x + 90, y: world.ship.y - 10,
      vx: 600, vy: -120, radius: 4, damage: 1, pierce: 0, life: 0.8,
    });
    world.showMessage('', 0);
    return;
  }
  if (name === 'upgrade') {
    world.startGame();
    world.wave = 4;
    world.score = 3210;
    world.quota = 28;
    world.quotaTarget = 28;
    world.ship.hull = 82;
    world.ship.upgrades = { rapid: 1, hull: 1 };
    world.upgradeChoices = rollUpgrades(rng, world.ship, 3);
    world.state = 'upgrade';
    world.showMessage('', 0);
    scatterAsteroids(world, rng, 4);
    return;
  }
  if (name === 'boss') {
    world.startGame();
    world.wave = 5;
    world.score = 5420;
    world.quotaTarget = 34;
    world.boss = makeBoss(5);
    world.boss.state = 'fight';
    world.boss.y = 130;
    world.boss.hull = 68;
    world.ship.x = CONFIG.width / 2;
    world.ship.y = CONFIG.height - 140;
    world.ship.angle = -Math.PI / 2;
    world.ship.hull = 61;
    scatterAsteroids(world, rng, 5);
    scatterShards(world, rng, 6);
    return;
  }
  if (name === 'end') {
    world.startGame();
    world.wave = 6;
    world.score = 4875;
    world.kills = 41;
    world.shardsCollected = 58;
    world.ship.hull = 0;
    world.state = 'over';
    world.saveBest();
    scatterAsteroids(world, rng, 5);
    return;
  }
  // Unknown shot name: fall back to the title screen.
  world.state = 'title';
  scatterAsteroids(world, rng, 7);
}
