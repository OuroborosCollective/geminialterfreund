/**
 * Mulberry32 — fast, deterministic, seedable PRNG.
 * The same seed always produces the same sequence.
 */
export interface PRNG {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(arr: T[]): T;
  pickWeighted<T>(items: { value: T; weight: number }[]): T;
  shuffle<T>(arr: T[]): T[];
  fork(salt: number): PRNG;
}

export function createPRNG(seed: number): PRNG {
  let s = seed >>> 0;
  const prng: PRNG = {
    next(): number {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    nextInt(min: number, max: number): number {
      return Math.floor(prng.next() * (max - min + 1)) + min;
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(prng.next() * arr.length)];
    },
    pickWeighted<T>(items: { value: T; weight: number }[]): T {
      const total = items.reduce((acc, i) => acc + i.weight, 0);
      let r = prng.next() * total;
      for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item.value;
      }
      return items[items.length - 1].value;
    },
    shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(prng.next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    fork(salt: number): PRNG {
      return createPRNG((s ^ (salt * 2654435761)) >>> 0);
    },
  };
  return prng;
}

/** Convert a string seed to a numeric seed */
export function seedFromString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}
