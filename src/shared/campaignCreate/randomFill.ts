import type { CampaignSetupFormValues, DeathMode } from './types'
import {
  MAX_ADDITIONAL_REGION_NPC_COUNT,
  MAX_NPCS_PER_REGION,
  MAX_REGION_COUNT,
  MIN_ADDITIONAL_REGION_NPC_COUNT,
  MIN_NPCS_PER_REGION,
  MIN_REGION_COUNT
} from './types'
import { clampNpcsPerRegion, clampRegionCount, normalizeFormValues } from './validation'

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

function resolveSource(source?: RandomSource): RandomSource {
  return source ?? defaultRandomSource
}

function pick<T>(source: RandomSource, items: readonly T[]): T {
  const index = Math.floor(source.next() * items.length)
  return items[Math.min(index, items.length - 1)]!
}

function pickInt(source: RandomSource, min: number, max: number): number {
  return min + Math.floor(source.next() * (max - min + 1))
}

const CAMPAIGN_NAME_ADJECTIVES = [
  'Crimson',
  'Shattered',
  'Forgotten',
  'Gilded',
  'Ashen',
  'Verdant',
  'Obsidian',
  'Hollow',
  'Sunken',
  'Wandering'
] as const

const CAMPAIGN_NAME_NOUNS = [
  'Vale',
  'Crown',
  'Reach',
  'Marches',
  'Spire',
  'Harbor',
  'Covenant',
  'Ledger',
  'Threshold',
  'Ember'
] as const

const CAMPAIGN_NAME_EPITHETS = ['The', 'Chronicles of', 'Saga of', 'Tales from'] as const

const PREMISE_TEMPLATES = [
  'A {tone} {setting} where {hook}.',
  'Mercenaries arrive in a {setting} just as {hook}.',
  'The party is hired to investigate {hook} in a {setting} ruled by {faction}.',
  'Rumors spread through a {tone} {setting}: {hook}.',
  'After a {event}, survivors gather in a {setting} and face {hook}.',
  'A {tone} frontier {setting} becomes the stage for {hook}.',
  'Nobles and outcasts clash when {hook} unsettles a {setting}.',
  'An old map points to a {setting} where {hook}.',
  'Winter closes in on a {setting} while {hook}.',
  'A traveling company discovers that {hook} in a {setting}.',
  'Faith and steel collide when {hook} threatens a {setting}.',
  'The last safe road to a {setting} runs through territory where {hook}.'
] as const

const PREMISE_TONES = ['grim', 'mysterious', 'volatile', 'decaying', 'hopeful', 'lawless'] as const
const PREMISE_SETTINGS = [
  'river kingdom',
  'busy salt port',
  'mountain pass',
  'border duchy',
  'ruined monastery',
  'mining colony',
  'foggy marsh',
  'desert caravan city'
] as const
const PREMISE_HOOKS = [
  'a missing envoy never returned from the uplands',
  'strange lights rise from the old quarries at dusk',
  'the guild charter was forged and debts are being called in',
  'refugees report wolves that walk upright',
  'a relic auction drew every faction in the region',
  'the river changed course and exposed drowned ruins',
  'a plague of dreams keeps soldiers awake on watch',
  'bandits now wear the faces of the dead'
] as const
const PREMISE_FACTIONS = [
  'a nervous council',
  'a mercenary company',
  'a secretive temple',
  'a trade consortium',
  'an exiled noble house'
] as const
const PREMISE_EVENTS = [
  'devastating fire',
  'failed harvest',
  'royal assassination',
  'border skirmish',
  'siege lifted at last minute'
] as const

const RESPAWN_LOCATIONS = [
  'Temple of Dawn',
  'Harbor Inn',
  'Wayfarer Shrine',
  'Old Watch Barracks',
  'Merchant Row Hospice',
  'Riverside Chapel',
  'Copper Kettle Tavern',
  'Saintsbridge Crossing'
] as const

const REGION_SEED_PLACES = [
  'misty fishing village',
  'cliffside observatory',
  'abandoned toll fort',
  'orchard valley with buried standing stones',
  'smuggler cove',
  'glassblower district',
  'sunken amphitheater',
  'windswept plateau monastery'
] as const

const REGION_SEED_MOODS = [
  'uneasy quiet',
  'festival tension',
  'recent arson',
  'imminent storm',
  'guild strike',
  'imperial audit',
  'pilgrim influx'
] as const

const REGION_SEED_CONFLICTS = [
  'a feud between dock crews and temple militia',
  'strange shipments arriving only at night',
  'a missing magistrate and unsigned warrants',
  'beast tracks circling the outer wall',
  'a prophecy everyone pretends to ignore'
] as const

const NPC_ROLES = [
  'retired dock guard',
  'itinerant healer',
  'bitter innkeeper',
  'young cartographer',
  'exiled duelist',
  'temple acolyte with a secret',
  'smuggler pretending to be a clerk'
] as const

const NPC_MOODS = [
  'wary but talkative',
  'desperate for coin',
  'furious at the local council',
  'haunted by a recent loss',
  'eager to sell information'
] as const

const DEATH_MODES: DeathMode[] = ['legendary', 'standard', 'respawn']

function fillTemplate(template: string, slots: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => slots[key] ?? key)
}

export function randomCampaignName(source?: RandomSource): string {
  const rng = resolveSource(source)
  if (rng.next() < 0.35) {
    return ''
  }
  if (rng.next() < 0.5) {
    return `${pick(rng, CAMPAIGN_NAME_ADJECTIVES)} ${pick(rng, CAMPAIGN_NAME_NOUNS)}`
  }
  return `${pick(rng, CAMPAIGN_NAME_EPITHETS)} ${pick(rng, CAMPAIGN_NAME_ADJECTIVES)} ${pick(rng, CAMPAIGN_NAME_NOUNS)}`
}

export function randomPremisePrompt(source?: RandomSource): string {
  const rng = resolveSource(source)
  const template = pick(rng, PREMISE_TEMPLATES)
  return fillTemplate(template, {
    tone: pick(rng, PREMISE_TONES),
    setting: pick(rng, PREMISE_SETTINGS),
    hook: pick(rng, PREMISE_HOOKS),
    faction: pick(rng, PREMISE_FACTIONS),
    event: pick(rng, PREMISE_EVENTS)
  })
}

export function randomRespawnLocation(source?: RandomSource): string {
  return pick(resolveSource(source), RESPAWN_LOCATIONS)
}

export function randomDeathMode(source?: RandomSource): DeathMode {
  return pick(resolveSource(source), DEATH_MODES)
}

export function randomRegionCount(source?: RandomSource): number {
  return clampRegionCount(pickInt(resolveSource(source), MIN_REGION_COUNT, MAX_REGION_COUNT))
}

export function randomNpcsPerRegion(source?: RandomSource): number {
  return clampNpcsPerRegion(pickInt(resolveSource(source), MIN_NPCS_PER_REGION, MAX_NPCS_PER_REGION))
}

export function randomRespawnCost(source?: RandomSource): number {
  return pickInt(resolveSource(source), 0, 500)
}

export function randomRespawnLimit(source?: RandomSource): number | '' {
  const rng = resolveSource(source)
  if (rng.next() < 0.5) {
    return ''
  }
  return pickInt(rng, 1, 5)
}

export function randomRegionSeedPrompt(source?: RandomSource): string {
  const rng = resolveSource(source)
  const place = pick(rng, REGION_SEED_PLACES)
  const mood = pick(rng, REGION_SEED_MOODS)
  const conflict = pick(rng, REGION_SEED_CONFLICTS)
  return `A ${place} under ${mood}, centered on ${conflict}.`
}

export function randomNpcSeedPrompt(regionName: string, source?: RandomSource): string {
  const rng = resolveSource(source)
  const role = pick(rng, NPC_ROLES)
  const mood = pick(rng, NPC_MOODS)
  return `A ${role} in ${regionName}, ${mood}, with a personal stake in local troubles.`
}

export function randomAdditionalRegionNpcCount(source?: RandomSource): number {
  return pickInt(
    resolveSource(source),
    MIN_ADDITIONAL_REGION_NPC_COUNT,
    MAX_ADDITIONAL_REGION_NPC_COUNT
  )
}

/** Composes all campaign-start fields — for tests; not wired to a single UI control. */
export function randomCampaignSetupForm(source?: RandomSource): CampaignSetupFormValues {
  const rng = resolveSource(source)
  const deathMode = randomDeathMode(rng)
  const form: CampaignSetupFormValues = {
    name: randomCampaignName(rng),
    premisePrompt: randomPremisePrompt(rng),
    deathMode,
    respawnLocation: deathMode === 'respawn' ? randomRespawnLocation(rng) : '',
    respawnCost: deathMode === 'respawn' ? randomRespawnCost(rng) : 0,
    respawnLimit: deathMode === 'respawn' ? randomRespawnLimit(rng) : '',
    regionCount: randomRegionCount(rng),
    npcsPerRegion: randomNpcsPerRegion(rng)
  }
  return normalizeFormValues(form)
}
