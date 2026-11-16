// Starlight Salvage — bootstrap. Sizes the canvas, wires input and sound,
// runs the frame loop, and stages screenshot scenes when ?shot= is present.

import { CONFIG } from './config.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { setupShot } from './shots.js';
import { makeAsteroid } from './entities.js';
import { rng } from './random.js';

const canvas = document.getElementById('game');
canvas.width = CONFIG.width;
canvas.height = CONFIG.height;

const sound = new SoundEngine();
const world = new World(sound);
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const status = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') ?? 7) || 7;

if (shotName) {
  setupShot(world, shotName, shotSeed);
  // Let the staged scene animate a little so particles and the starfield
  // settle, then tell the screenshot driver the frame is ready.
  let frames = 0;
  const settle = () => {
    world.update(1 / 60, input);
    input.endFrame();
    renderer.draw(world, input);
    frames += 1;
    if (frames < 24) {
      window.requestAnimationFrame(settle);
    } else {
      window.__shotReady = true;
    }
  };
  window.requestAnimationFrame(settle);
} else {
  // Title screen ambience: a few rocks drifting behind the menu.
  for (let i = 0; i < 6; i += 1) {
    world.asteroids.push(makeAsteroid(rng, 'large', rng.range(0, CONFIG.width), rng.range(0, CONFIG.height), 1));
  }

  window.addEventListener('pointerdown', () => sound.unlock(), { once: true });
  window.addEventListener('keydown', () => sound.unlock(), { once: true });

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    world.update(dt, input);
    input.endFrame();
    renderer.draw(world, input);
    if (status) {
      status.textContent = `Starlight Salvage — ${world.state}, wave ${world.wave}, `
        + `score ${world.score}, hull ${Math.ceil(world.ship.hull)}`;
    }
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);
}
