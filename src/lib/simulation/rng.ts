// Seeded PRNG using mulberry32 algorithm for reproducible simulations
export class SeededRNG {
  private state: number

  constructor(seed: number) {
    this.state = seed | 0
  }

  // Core mulberry32 — returns float in [0, 1)
  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Random integer in [min, max] inclusive
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  // Random float in [min, max)
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  // Fisher-Yates shuffle (in place)
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // Sample n items from array without replacement
  sample<T>(arr: T[], n: number): T[] {
    const copy = [...arr]
    this.shuffle(copy)
    return copy.slice(0, n)
  }
}
