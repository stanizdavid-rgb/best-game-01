// Starlight Salvage — small seeded random number generator. The live game
// uses a time-seeded stream; screenshot mode reseeds it so staged shots are
// reproducible.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed) {
    this.next = mulberry32(seed);
  }

  /** Float in [min, max). */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /** Random element of an array. */
  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }

  /** True with probability p (0..1). */
  chance(p) {
    return this.next() < p;
  }

  /** Random angle in radians. */
  angle() {
    return this.next() * Math.PI * 2;
  }
}

/** The stream the live game draws from. */
export const rng = new Rng((Date.now() ^ 0x9e3779b9) >>> 0);
