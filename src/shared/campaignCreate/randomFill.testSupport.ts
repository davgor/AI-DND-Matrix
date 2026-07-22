import type { CampaignSetupFormValues } from './types'
import type { RandomSource } from '../randomSource'
import { pickRandomInt, resolveRandomSource } from '../randomSource'
import { normalizeFormValues } from './validation'
import {
  randomCampaignName,
  randomDeathMode,
  randomNpcsPerRegion,
  randomPremisePrompt,
  randomRegionCount,
  randomRespawnLocation
} from './randomFill'

function randomRespawnCost(source?: RandomSource): number {
  return pickRandomInt(resolveRandomSource(source), 0, 500)
}

function randomRespawnLimit(source?: RandomSource): number | '' {
  const rng = resolveRandomSource(source)
  if (rng.next() < 0.5) {
    return ''
  }
  return pickRandomInt(rng, 1, 5)
}

/** Composes all campaign-start fields — for tests; not wired to a single UI control. */
export function randomCampaignSetupForm(source?: RandomSource): CampaignSetupFormValues {
  const rng = resolveRandomSource(source)
  const deathMode = randomDeathMode(rng)
  const form: CampaignSetupFormValues = {
    name: randomCampaignName(rng),
    premisePrompt: randomPremisePrompt(rng),
    deathMode,
    respawnLocation: deathMode === 'respawn' ? randomRespawnLocation(rng) : '',
    respawnCost: deathMode === 'respawn' ? randomRespawnCost(rng) : 0,
    respawnLimit: deathMode === 'respawn' ? randomRespawnLimit(rng) : '',
    regionCount: randomRegionCount(rng),
    npcsPerRegion: randomNpcsPerRegion(rng),
    npcFaceTokenGenerationEnabled: false,
    enemyTokenGenerationEnabled: false
  }
  return normalizeFormValues(form)
}
