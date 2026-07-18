import { pickRandom, resolveRandomSource, type RandomSource } from '../randomSource'

export type { RandomSource }
export { createSeededRandomSource } from '../randomSource'

const CUSTOM_RACE_TRAITS = [
  'scaled skin and slit-pupil eyes',
  'crystalline horns that hum near ley lines',
  'feathered limbs and hollow bones',
  'living bark skin and sap-blood',
  'mist that follows them at dawn',
  'echoing voices from a forgotten ancestor',
  'bioluminescent markings along the spine',
  'metallic hair that rings when struck'
] as const

const CUSTOM_RACE_ORIGINS = [
  'exiled from a hidden enclave',
  'born where two realms overlap',
  'descended from a pact-bound lineage',
  'raised by nomads who found them as an infant',
  'awakened after a celestial omen',
  'remade by an ancient ritual gone wrong',
  'survivors of a drowned homeland',
  'crafted as guardians but granted free will'
] as const

const CUSTOM_RACE_ROLES = [
  'keepers of oral law',
  'wandering mediators between feuding clans',
  'hunters of things that should not walk',
  'artisans who weave memory into cloth',
  'pilgrims seeking a promised threshold',
  'outcasts who trade secrets for shelter',
  'sailors who read stars no chart names',
  'hermits who guard a sleeping god'
] as const

export function randomCustomRaceSeed(source?: RandomSource): string {
  const rng = resolveRandomSource(source)
  const trait = pickRandom(rng, CUSTOM_RACE_TRAITS)
  const origin = pickRandom(rng, CUSTOM_RACE_ORIGINS)
  const role = pickRandom(rng, CUSTOM_RACE_ROLES)
  return `A people with ${trait}, ${origin}, known as ${role}.`
}
