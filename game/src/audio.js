// Starlight Salvage — all sound is synthesized with WebAudio at run time.
// No audio files ship with the game, so nothing is fetched over the network.

const MUSIC_NOTES = [110.0, 130.81, 98.0, 146.83, 87.31, 164.81, 98.0, 130.81];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.lastShoot = 0;
  }

  /** Must be called from a user gesture at least once. Safe to call often. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // No audio device: the game plays silent, never crashes.
    }
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.15, vol = 0.2, when = 0 }) {
    if (!this.ready || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.3, vol = 0.25, low = 400, when = 0 }) {
    if (!this.ready || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() {
    const now = performance.now();
    if (now - this.lastShoot < 40) return; // keep rapid fire from clipping
    this.lastShoot = now;
    this._tone({ freq: 880, freqEnd: 220, type: 'square', dur: 0.09, vol: 0.08 });
  }

  enemyShoot() {
    this._tone({ freq: 320, freqEnd: 140, type: 'sawtooth', dur: 0.16, vol: 0.07 });
  }

  explode(big = false) {
    this._noise({ dur: big ? 0.6 : 0.3, vol: big ? 0.4 : 0.22, low: big ? 900 : 1400 });
    this._tone({ freq: big ? 120 : 180, freqEnd: 40, type: 'triangle', dur: big ? 0.5 : 0.25, vol: 0.25 });
  }

  pickup(comboStep) {
    const base = 520 * Math.pow(1.059463, Math.min(comboStep, 12));
    this._tone({ freq: base, type: 'sine', dur: 0.12, vol: 0.14 });
    this._tone({ freq: base * 1.5, type: 'sine', dur: 0.1, vol: 0.08, when: 0.04 });
  }

  hit() {
    this._tone({ freq: 160, freqEnd: 55, type: 'sawtooth', dur: 0.3, vol: 0.3 });
    this._noise({ dur: 0.2, vol: 0.2, low: 700 });
  }

  powerup() {
    [523.25, 659.25, 783.99].forEach((f, i) => this._tone({ freq: f, type: 'sine', dur: 0.14, vol: 0.14, when: i * 0.07 }));
  }

  upgrade() {
    [392.0, 523.25, 659.25, 783.99].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.16, when: i * 0.08 }));
  }

  waveClear() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.16, when: i * 0.09 }));
  }

  gameOver() {
    [392.0, 329.63, 261.63, 196.0].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.35, vol: 0.18, when: i * 0.18 }));
  }

  victory() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.16, when: i * 0.1 }));
  }

  click() {
    this._tone({ freq: 700, type: 'sine', dur: 0.06, vol: 0.1 });
  }

  /** A quiet looping bass line, scheduled a bar ahead. */
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ready || this.muted) return;
      const note = MUSIC_NOTES[this.musicStep % MUSIC_NOTES.length];
      this.musicStep += 1;
      this._tone({ freq: note, type: 'triangle', dur: 0.55, vol: 0.05 });
      if (this.musicStep % 2 === 0) this._tone({ freq: note * 2, type: 'sine', dur: 0.3, vol: 0.025 });
    }, 420);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
