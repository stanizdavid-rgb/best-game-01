// Starlight Salvage — everything the player sees. Canvas 2D, drawn from the
// world's state each frame: starfield, entities, HUD, and the menu screens.

import { CONFIG } from './config.js';

const TAU = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, bg = '#1d2733') {
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w * Math.min(1, frac), h, h / 2);
    ctx.fill();
  }
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nebula = this._makeNebula();
  }

  _makeNebula() {
    const off = document.createElement('canvas');
    off.width = CONFIG.width;
    off.height = CONFIG.height;
    const c = off.getContext('2d');
    const blobs = [
      { x: 220, y: 160, r: 320, color: 'rgba(64, 48, 140, 0.35)' },
      { x: 1050, y: 120, r: 280, color: 'rgba(16, 110, 130, 0.30)' },
      { x: 900, y: 600, r: 340, color: 'rgba(140, 48, 96, 0.25)' },
      { x: 300, y: 620, r: 260, color: 'rgba(40, 90, 160, 0.28)' },
    ];
    for (const b of blobs) {
      const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, b.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    return off;
  }

  draw(world, input) {
    const ctx = this.ctx;
    ctx.save();
    if (world.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this._drawBackground(world);
    this._drawPickups(world);
    this._drawShards(world);
    this._drawAsteroids(world);
    this._drawDrones(world);
    this._drawBoss(world);
    this._drawBullets(world);
    this._drawOrbs(world);
    if (world.state !== 'title') this._drawShip(world);
    this._drawParticles(world);
    this._drawFloats(world);
    ctx.restore();

    if (world.state === 'title') this._drawTitle(world);
    else if (world.state === 'upgrade') this._drawUpgrade(world, input);
    else if (world.state === 'paused') this._drawPaused(world);
    else if (world.state === 'over') this._drawGameOver(world);
    else if (world.state === 'victory') this._drawVictory(world);
    if (world.state === 'playing' || world.state === 'paused' || world.state === 'upgrade') {
      this._drawHud(world);
    }
    if (world.messageTimer > 0 && world.state === 'playing') {
      this._drawMessage(world);
    }
  }

  _drawBackground(world) {
    const ctx = this.ctx;
    ctx.fillStyle = '#070b18';
    ctx.fillRect(-20, -20, CONFIG.width + 40, CONFIG.height + 40);
    ctx.drawImage(this.nebula, 0, 0);
    world.stars.forEach((layer, li) => {
      const drift = world.time * (2 + li * 3);
      for (const s of layer) {
        const y = (s.y + drift) % CONFIG.height;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(world.time * 1.5 + s.tw));
        ctx.globalAlpha = a * (0.4 + li * 0.25);
        ctx.fillStyle = li === 2 ? '#cfe6ff' : '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, TAU);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  _drawShip(world) {
    const ctx = this.ctx;
    const s = world.ship;
    if (world.state === 'over') return;
    if (s.invuln > 0 && Math.floor(world.time * 14) % 2 === 0 && world.state === 'playing') {
      // Blink while invulnerable.
      return;
    }
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    // Engine flame.
    if (s.thrusting) {
      const len = 20 + Math.random() * 12;
      ctx.fillStyle = '#ff9a2f';
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.lineTo(-12 - len, 0);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.moveTo(-12, -3.5);
      ctx.lineTo(-12 - len * 0.6, 0);
      ctx.lineTo(-12, 3.5);
      ctx.closePath();
      ctx.fill();
    }
    // Hull: a salvage tug with a cargo claw.
    ctx.fillStyle = '#dfe8f2';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3f6fb5';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-2, -6);
    ctx.lineTo(-2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(4, 0, 3.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8fa8c4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(26, -5);
    ctx.moveTo(20, 0);
    ctx.lineTo(26, 5);
    ctx.stroke();
    ctx.restore();
    // Shield ring.
    if (s.shield > 0) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(world.time * 5);
      ctx.strokeStyle = '#66ccff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius + 8, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  _drawAsteroids(world) {
    const ctx = this.ctx;
    for (const a of world.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.fillStyle = a.flash > 0 ? '#f4e3c2' : '#9a7d5f';
      ctx.beginPath();
      a.shape.forEach((p, i) => {
        const x = Math.cos(p.a) * p.r;
        const y = Math.sin(p.a) * p.r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6b543d';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(60, 42, 26, 0.55)';
      for (const c of a.craters) {
        ctx.beginPath();
        ctx.arc(Math.cos(c.a) * a.radius * c.d, Math.sin(c.a) * a.radius * c.d, a.radius * c.r, 0, TAU);
        ctx.fill();
      }
      // Cracks show how many hits are left on big rocks.
      if (a.maxHits > 1 && a.hits < a.maxHits) {
        ctx.strokeStyle = 'rgba(255, 220, 120, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-a.radius * 0.4, -a.radius * 0.3);
        ctx.lineTo(0, 0);
        ctx.lineTo(a.radius * 0.4, a.radius * 0.25);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawShards(world) {
    const ctx = this.ctx;
    for (const sh of world.shards) {
      const blink = 0.75 + 0.25 * Math.sin(world.time * 6 + sh.phase);
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(world.time * 2 + sh.phase);
      ctx.globalAlpha = Math.min(1, sh.life) * blink;
      ctx.fillStyle = '#ffe066';
      ctx.shadowColor = '#ffcc33';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  _drawPickups(world) {
    const ctx = this.ctx;
    for (const p of world.pickups) {
      const bob = Math.sin(world.time * 4 + p.phase) * 3;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.type === 'shield' ? '#66ccff' : '#66ff99';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#07202e';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type === 'shield' ? 'S' : '+', 0, 1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  _drawBullets(world) {
    const ctx = this.ctx;
    ctx.fillStyle = '#aee6ff';
    ctx.shadowColor = '#66ccff';
    ctx.shadowBlur = 8;
    for (const b of world.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  _drawOrbs(world) {
    const ctx = this.ctx;
    for (const o of world.orbs) {
      ctx.fillStyle = '#ff5566';
      ctx.shadowColor = '#ff2244';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  _drawDrones(world) {
    const ctx = this.ctx;
    for (const d of world.drones) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.fillStyle = d.flash > 0 ? '#ffd7db' : '#c0392b';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffdd66';
      ctx.beginPath();
      ctx.arc(4, 0, 3.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawBoss(world) {
    const ctx = this.ctx;
    const b = world.boss;
    if (!b) return;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle + Math.PI / 2);
    ctx.fillStyle = b.flash > 0 ? '#ffd7db' : '#5b2a3a';
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.lineTo(58, -30);
    ctx.lineTo(74, 30);
    ctx.lineTo(30, 66);
    ctx.lineTo(-30, 66);
    ctx.lineTo(-74, 30);
    ctx.lineTo(-58, -30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff5566';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ff2244';
    ctx.beginPath();
    ctx.arc(0, -10, 16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(0, -10, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    for (const sx of [-44, 44]) {
      ctx.fillRect(sx - 8, 10, 16, 26);
    }
    ctx.restore();
    // Boss health bar.
    const w = 320;
    const x = CONFIG.width / 2 - w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, x - 6, 26, w + 12, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ff8899';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DREADNOUGHT', CONFIG.width / 2, 38);
    bar(ctx, x, 42, w, 8, b.hull / b.maxHull, '#ff4455');
  }

  _drawParticles(world) {
    const ctx = this.ctx;
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  _drawFloats(world) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of world.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.font = `bold ${f.size}px sans-serif`;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  _drawHud(world) {
    const ctx = this.ctx;
    const s = world.ship;
    ctx.fillStyle = 'rgba(4, 10, 24, 0.62)';
    roundRect(ctx, 12, 10, CONFIG.width - 24, 64, 10);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, 28, 32);
    ctx.fillStyle = '#9fb6d1';
    ctx.font = '15px sans-serif';
    ctx.fillText(`BEST ${world.best.toLocaleString('en-US')}`, 30, 56);
    // Quota progress.
    const qx = 330;
    ctx.fillStyle = '#cfe6ff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`WAVE ${world.wave}  •  SALVAGE ${Math.min(world.quota, world.quotaTarget)}/${world.quotaTarget}`, qx, 30);
    bar(ctx, qx, 44, 260, 12, world.quotaTarget ? world.quota / world.quotaTarget : 0, '#ffd24d');
    // Hull + shield.
    const hx = 660;
    ctx.fillStyle = '#cfe6ff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('HULL', hx, 30);
    bar(ctx, hx + 66, 22, 156, 14, s.hull / s.maxHull, s.hull / s.maxHull > 0.3 ? '#4dd07a' : '#ff5544');
    ctx.fillStyle = '#cfe6ff';
    ctx.fillText('SHIELD', hx, 56);
    bar(ctx, hx + 66, 48, 156, 14, s.maxShield ? s.shield / s.maxShield : 0, '#4db2ff');
    // Combo.
    if (world.combo >= 2) {
      const mult = world.comboMultiplier;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffb347';
      ctx.font = `bold ${22 + Math.min(10, mult * 2)}px sans-serif`;
      ctx.fillText(`COMBO x${mult}`, CONFIG.width - 30, 34);
      ctx.fillStyle = '#9fb6d1';
      ctx.font = '13px sans-serif';
      ctx.fillText(`${world.combo} in a row`, CONFIG.width - 30, 58);
      ctx.textAlign = 'left';
    }
    // Controls hint.
    ctx.fillStyle = 'rgba(159, 182, 209, 0.85)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows: fly   •   Mouse: aim   •   Hold click / Space: fire   •   P: pause   •   M: mute', CONFIG.width / 2, CONFIG.height - 16);
    ctx.textAlign = 'left';
  }

  _drawMessage(world) {
    const ctx = this.ctx;
    ctx.globalAlpha = Math.min(1, world.messageTimer);
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillText(world.message, CONFIG.width / 2, 130);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  _panel(ctx, title, lines, accent = '#ffe066') {
    ctx.fillStyle = 'rgba(3, 8, 20, 0.72)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(title, CONFIG.width / 2, 200);
    ctx.fillStyle = '#dfe8f2';
    ctx.font = '19px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, CONFIG.width / 2, 258 + i * 34);
    });
    ctx.textAlign = 'left';
  }

  _drawTitle(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3, 8, 20, 0.55)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 68px sans-serif';
    ctx.shadowColor = '#ff9a2f';
    ctx.shadowBlur = 26;
    ctx.fillText('STARLIGHT SALVAGE', CONFIG.width / 2, 190);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aee6ff';
    ctx.font = 'italic 22px sans-serif';
    ctx.fillText('Blast the rocks. Grab the gold. Survive ten waves.', CONFIG.width / 2, 236);
    ctx.fillStyle = '#dfe8f2';
    ctx.font = '19px sans-serif';
    const lines = [
      'Fly with WASD or arrow keys — aim with the mouse, hold click or Space to fire.',
      'Shattered asteroids drop salvage shards: collect them to fill each wave’s quota.',
      'Chain pickups to raise your combo multiplier. Raiders appear from wave 3.',
      'Between waves, pick 1 of 3 upgrades. On waves 5 and 10, a Dreadnought hunts you.',
      'Clear wave 10 to win the contract. Lose all hull and the run is over.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, CONFIG.width / 2, 300 + i * 32));
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 26px sans-serif';
    const pulse = 0.7 + 0.3 * Math.sin(world.time * 4);
    ctx.globalAlpha = pulse;
    ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', CONFIG.width / 2, 510);
    ctx.globalAlpha = 1;
    if (world.best > 0) {
      ctx.fillStyle = '#9fb6d1';
      ctx.font = '18px sans-serif';
      ctx.fillText(`Best score: ${world.best.toLocaleString('en-US')}`, CONFIG.width / 2, 556);
    }
    ctx.textAlign = 'left';
  }

  _drawUpgrade(world, input) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3, 8, 20, 0.72)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`WAVE ${world.wave} CLEARED`, CONFIG.width / 2, 150);
    ctx.fillStyle = '#dfe8f2';
    ctx.font = '21px sans-serif';
    ctx.fillText('Choose one upgrade — click a card or press 1, 2 or 3', CONFIG.width / 2, 200);
    const cardW = 300;
    const cardH = 210;
    const gap = 36;
    const total = world.upgradeChoices.length * cardW + (world.upgradeChoices.length - 1) * gap;
    const x0 = (CONFIG.width - total) / 2;
    const y0 = 300;
    world.upgradeChoices.forEach((up, i) => {
      const cx = x0 + i * (cardW + gap);
      const hover = input.mouse.x >= cx && input.mouse.x <= cx + cardW
        && input.mouse.y >= y0 && input.mouse.y <= y0 + cardH;
      ctx.fillStyle = hover ? 'rgba(70, 110, 170, 0.9)' : 'rgba(24, 40, 66, 0.92)';
      roundRect(ctx, cx, y0, cardW, cardH, 14);
      ctx.fill();
      ctx.strokeStyle = hover ? '#ffe066' : '#3f6fb5';
      ctx.lineWidth = hover ? 3 : 2;
      ctx.stroke();
      ctx.fillStyle = '#ffe066';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`PRESS ${i + 1}`, cx + cardW / 2, y0 + 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 23px sans-serif';
      this._wrapText(ctx, up.name, cx + cardW / 2, y0 + 72, cardW - 32, 26);
      ctx.fillStyle = '#cfe6ff';
      ctx.font = '17px sans-serif';
      this._wrapText(ctx, up.desc, cx + cardW / 2, y0 + 122, cardW - 32, 24);
      const level = world.ship.upgrades[up.id] ?? 0;
      ctx.fillStyle = '#9fb6d1';
      ctx.font = '14px sans-serif';
      ctx.fillText(level > 0 ? `Owned: Lv ${level}  •  max Lv ${up.max}` : `Max Lv ${up.max}`, cx + cardW / 2, y0 + cardH - 22);
    });
    ctx.textAlign = 'left';
  }

  _wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
    return lines.length;
  }

  _drawPaused(world) {
    this._panel(this.ctx, 'PAUSED', [
      'Take a breath, salvager.',
      'Press P or Enter to keep flying.',
    ]);
  }

  _drawGameOver(world) {
    this._panel(this.ctx, 'SHIP LOST', [
      `You reached wave ${world.wave} with ${world.score.toLocaleString('en-US')} points.`,
      `${world.kills} rocks and raiders destroyed  •  ${world.shardsCollected} salvage collected.`,
      `Best score: ${world.best.toLocaleString('en-US')}`,
      '',
      'Press Enter or click to fly again.',
    ], '#ff6b6b');
  }

  _drawVictory(world) {
    this._panel(this.ctx, 'CONTRACT COMPLETE!', [
      'The Dreadnought is scrap and all ten waves are cleared.',
      `Final score: ${world.score.toLocaleString('en-US')}  •  Best: ${world.best.toLocaleString('en-US')}`,
      `${world.kills} destroyed  •  ${world.shardsCollected} salvage collected.`,
      '',
      'Press Enter or click to run it back for a bigger score.',
    ], '#7dffb0');
  }
}
