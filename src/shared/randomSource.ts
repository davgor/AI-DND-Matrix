export interface RandomSource {
  next(): number
}

export function createSeededRandomSource(seed: number): RandomSource {
  let state = seed >>> 0
  return {
    next(): number {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0
      return state / 0x1_0000_0000
    }
  }
}

const defaultRandomSource: RandomSource = { next: () => Math.random() }

export function resolveRandomSource(source?: RandomSource): RandomSource {
  return source ?? defaultRandomSource
}

export function pickRandom<T>(source: RandomSource, items: readonly T[]): T {
  const index = Math.floor(source.next() * items.length)
  return items[Math.min(index, items.length - 1)]!
}

export function pickRandomInt(source: RandomSource, min: number, max: number): number {
  return min + Math.floor(source.next() * (max - min + 1))
}
