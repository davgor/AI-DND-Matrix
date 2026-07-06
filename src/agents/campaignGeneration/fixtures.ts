export function makeRegion(name: string, suffix: string) {
  return {
    name,
    description: `Description of ${name}.`,
    historyBackstory: `Deep history of ${name}.`,
    recentHistory: `Recent events in ${name} (${suffix}).`,
    potentialQuests: [`Quest A in ${name}`, `Quest B in ${name}`]
  }
}

export function makeNpcs(regionName: string, prefix: string) {
  return [
    {
      name: `${prefix} One`,
      role: 'guide',
      backstory: `${prefix} One has guided travelers through ${regionName} for years.`,
      disposition: 'friendly hook',
      regionName,
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral',
      raceKey: 'human',
      backgroundKey: 'folk_hero',
      genderKey: 'unspecified',
      classKey: 'commoner'
    },
    {
      name: `${prefix} Two`,
      role: 'merchant',
      backstory: `${prefix} Two runs a modest stall in ${regionName}.`,
      disposition: 'curious hook',
      regionName,
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good',
      raceKey: 'human',
      backgroundKey: 'merchant',
      genderKey: 'woman',
      classKey: 'commoner'
    },
    {
      name: `${prefix} Three`,
      role: 'guard',
      backstory: `${prefix} Three keeps watch on the roads near ${regionName}.`,
      disposition: 'wary hook',
      regionName,
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral',
      raceKey: 'human',
      backgroundKey: 'soldier',
      genderKey: 'man',
      classKey: 'fighter'
    }
  ]
}

export const VALID_WORLD = {
  worldName: 'Tyria',
  worldSummary:
    'Tyria is a chain of storm-wracked isles where old empires drowned.\n\nTrade routes still cross the inner sea, but every captain carries charts marked with vanished ports.\n\nPower here is fragmented — councils, cults, and company charters all claim legitimacy.',
  worldHistory:
    'Three ages ago the continental shelf cracked during the Sundering.\n\nSalvagers still dredge barnacled crowns from the inner bays.\n\nFor two centuries the Charting Compact mapped safe passages until company wars broke the tithe system.\n\nIn the last generation explorer crews have pushed past the outer shoals again.\n\nToday the inner sea routes are contested again by guilds, storm-priests, and captains who swear the drowned still vote on every treaty.'
}

/** Common live-model world shape: snake_case keys and single-newline paragraph breaks. */
export const REALISTIC_LLM_WORLD = {
  world_name: 'Eldermere',
  world_summary:
    'Winter steel closes on a desert caravan realm where salt and glass trade still matters.\nA missing envoy vanished into the uplands before the frost came.\nCaravan masters and temple wardens now argue over who owns the last water rights.',
  world_history:
    'Eldermere was a shallow inland sea until the Sundering lifted the desert basins and stranded the old ports.\nCaravans first bridged the glass flats when oasis law was written in ink on bone.\nThe envoy houses were founded to carry trade oaths between plateau clans.\nLast decade, winter storms arrived early and broke the old rain calendars.\nNow the Ashen Crown Kingdom and its rivals fight over the last caravan corridors before the frost seals every pass.'
}

function makeRealisticLlmNpc(regionName: string, index: number) {
  const names = ['Sera Vashti', 'Dekkan Moor', 'Riven Koss', 'Mara Jhal', 'Tobin Fleck', 'Lysa Quor']
  const name = names[index] ?? `Traveler ${index}`
  return {
    name,
    role: 'caravan factor',
    backstory: `${name} keeps ledgers for trading houses in ${regionName}.`,
    disposition: 'cautious but helpful',
    region_name: regionName,
    temperament: 'Cautious',
    can_speak: true,
    alignment: 'Neutral Good',
    race: 'human',
    background: 'Merchant',
    gender: 'woman',
    class: 'commoner'
  }
}

/** Crimson Reach scenario — short world prose + friendly temperament (common live-model drift). */
export const CRIMSON_REACH_LLM_WORLD = {
  world_name: 'Venn Calder',
  world_summary:
    'A failed harvest drove survivors into mountain kingdoms where bandits now wear the faces of the dead.\nWinter closes every escape route while the living argue over the last granaries.\nThe world remembers older wars and older oaths that no one living can quite name.',
  world_history:
    'The gods drowned the low roads in red ash when the old compact between mountain clans broke.\nThe Reach corridor was once a trade route before the uplands rose and choked the low roads.\nFace-thief bandits appeared after the first frost corpses were pulled from the snow.\nEnvoys from the low cities stopped coming when the pass avalanches began.\nSurvivors still light beacon fires that no longer summon help, and every kingdom blames the others for the hunger winter.'
}

export function buildCrimsonReachCascadingResponses(input: {
  regionCount: number
  npcsPerRegion: number
}): string[] {
  const regions = [
    makeRegion('Kingdom of Granary Pass', 'frost'),
    makeRegion('Deadface Marches', 'bandit')
  ].slice(0, input.regionCount)
  const responses: string[] = [JSON.stringify(CRIMSON_REACH_LLM_WORLD)]
  responses.push(JSON.stringify({ regions }))
  let npcIndex = 0
  for (const region of regions) {
    for (let slot = 0; slot < input.npcsPerRegion; slot += 1) {
      const base = makeRealisticLlmNpc(region.name, npcIndex)
      responses.push(JSON.stringify({ npc: { ...base, temperament: 'friendly', race: 'Human' } }))
      npcIndex += 1
    }
  }
  responses.push(
    JSON.stringify({
      storyThread: {
        title: 'Faces in the Snow',
        state: 'starting',
        summary: 'Learn who leads the dead-faced bandits before the pass seals for winter.'
      }
    })
  )
  return responses
}

/** Scripted responses that mirror common live LLM casing and prose habits. */
export function buildRealisticLlmCascadingSeedResponses(input: {
  regionCount: number
  npcsPerRegion: number
}): string[] {
  const regions = [
    makeRegion('Ashen Crown Kingdom', 'desert'),
    makeRegion('Windward Marches', 'frost')
  ].slice(0, input.regionCount)
  const responses: string[] = [`\`\`\`json\n${JSON.stringify(REALISTIC_LLM_WORLD)}\n\`\`\``]
  responses.push(JSON.stringify({ regions }))
  let npcIndex = 0
  for (const region of regions) {
    for (let slot = 0; slot < input.npcsPerRegion; slot += 1) {
      responses.push(JSON.stringify({ npc: makeRealisticLlmNpc(region.name, npcIndex) }))
      npcIndex += 1
    }
  }
  responses.push(
    JSON.stringify({
      story_thread: {
        title: 'The Missing Envoy',
        state: 'starting',
        summary: 'Find who stopped the upland envoy before winter closes every pass.'
      }
    })
  )
  return responses
}

export function makeSingleNpcPayload(regionName: string, npc: ReturnType<typeof makeNpcs>[number]): string {
  return JSON.stringify({ npc })
}

export function buildCascadingSeedResponses(input: {
  regionCount: number
  npcsPerRegion: number
  regions?: ReturnType<typeof makeRegion>[]
  storyThread?: { title: string; state: string; summary: string }
}): string[] {
  const regions =
    input.regions ??
    (input.regionCount === 0
      ? []
      : input.regionCount === 1
        ? [makeRegion('Oakhollow', 'old')]
        : [makeRegion('Oakhollow', 'old'), makeRegion('The Sunken Crown', 'ruin')])
  const storyThread =
    input.storyThread ??
    ({ title: 'The Crown Beneath the Waves', state: 'starting', summary: 'A throne lies hidden.' } as const)

  const responses: string[] = [JSON.stringify(VALID_WORLD)]
  responses.push(JSON.stringify({ regions }))
  for (const region of regions) {
    const npcTemplates = makeNpcs(region.name, region.name.slice(0, 4))
    for (let index = 0; index < input.npcsPerRegion; index += 1) {
      responses.push(makeSingleNpcPayload(region.name, npcTemplates[index]!))
    }
  }
  responses.push(JSON.stringify({ storyThread }))
  return responses
}

export const VALID_GENERATION = JSON.stringify({
  regions: [makeRegion('Oakhollow', 'old'), makeRegion('The Sunken Crown', 'ruin')],
  npcs: [...makeNpcs('Oakhollow', 'Oak'), ...makeNpcs('The Sunken Crown', 'Crown')],
  storyThread: { title: 'The Crown Beneath the Waves', state: 'starting', summary: 'A throne lies hidden.' }
})

export const ADDITIONAL_REGION = JSON.stringify({
  region: makeRegion('Mistfen Crossing', 'marsh'),
  npcs: makeNpcs('Mistfen Crossing', 'Mist')
})

export const SETUP_INPUT = { name: 'Test Campaign', premisePrompt: 'A flooded kingdom.', deathMode: 'legendary' } as const

/** Scripted retired-adventurer review responses for campaign persist tests. */
export function npcReviewResponses(count: number): string[] {
  return Array.from({ length: count }, () => '{"upgrade":false}')
}

export const RACE_LORE_RESPONSE = JSON.stringify({
  summary: 'Humans are widespread.',
  appearance: 'Varied.',
  culture: 'Ambitious.',
  roleInThisLand: 'Settlers.',
  hooks: ['A frontier town grows.']
})

export const LEGACY_NORMALIZE_PAYLOAD = {
  regions: [
    { name: 'Azure Expanse', description: 'Open ocean.', historyBackstory: 'Uncharted until now.' },
    { name: 'Tidemark Reach', description: 'A harbor.', historyBackstory: 'Old trade port.' }
  ],
  npcs: [
    {
      name: 'Elira',
      role: 'captain',
      disposition: 'bold hook',
      backstory: 'Elira has captained survey vessels for a decade.',
      regionName: 'Azure Expanse',
      temperament: 'cunning',
      canSpeak: true,
      alignment: 'chaotic_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    },
    {
      name: 'Mara',
      role: 'navigator',
      disposition: 'curious hook',
      backstory: 'Mara charts reefs for any crew that will hire her.',
      regionName: 'azure expanse',
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    },
    {
      name: 'Jon',
      role: 'diver',
      disposition: 'grim hook',
      backstory: 'Jon salvage-dives wrecks along the Azure Expanse.',
      regionName: 'Azure Expanse',
      temperament: 'cautious',
      canSpeak: true,
      alignment: 'true_neutral',
      raceKey: 'human',
      backgroundKey: 'folk_hero',
      genderKey: 'unspecified',
      classKey: 'commoner'
    },
    {
      name: 'Pell',
      role: 'harbor master',
      disposition: 'wary hook',
      backstory: 'Pell keeps order on the Tidemark docks.',
      regionName: 'Tidemark Reach',
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    },
    {
      name: 'Sera',
      role: 'merchant',
      disposition: 'friendly hook',
      backstory: 'Sera trades rope and sailcloth to passing crews.',
      regionName: 'Tidemark Reach',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    },
    {
      name: 'Vik',
      role: 'guard',
      disposition: 'stern hook',
      backstory: 'Vik served on a coastal patrol before retiring to harbor watch.',
      regionName: 'Tidemark Reach',
      temperament: 'aggressive',
      canSpeak: true,
      alignment: 'lawful_evil',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    }
  ],
  storyThread: { title: 'The New Ocean', state: 'starting', summary: 'Explorers push outward.' }
}

export const TRIM_NPCS_PAYLOAD = {
  regions: [
    { name: 'Azure Expanse', description: 'Open ocean.', historyBackstory: 'Uncharted until now.' },
    { name: 'Tidemark Reach', description: 'A harbor.', historyBackstory: 'Old trade port.' }
  ],
  npcs: [
    { name: 'A', role: 'a', disposition: 'a', backstory: 'A local history.', regionName: 'Azure Expanse', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' },
    { name: 'B', role: 'b', disposition: 'b', backstory: 'B local history.', regionName: 'Azure Expanse', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' },
    { name: 'C', role: 'c', disposition: 'c', backstory: 'C local history.', regionName: 'Azure Expanse', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' },
    { name: 'D', role: 'd', disposition: 'd', backstory: 'D local history.', regionName: 'Azure Expanse', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' },
    { name: 'E', role: 'e', disposition: 'e', backstory: 'E local history.', regionName: 'Tidemark Reach', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' },
    { name: 'F', role: 'f', disposition: 'f', backstory: 'F local history.', regionName: 'Tidemark Reach', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' },
    { name: 'G', role: 'g', disposition: 'g', backstory: 'G local history.', regionName: 'Tidemark Reach', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' },
    { name: 'H', role: 'h', disposition: 'h', backstory: 'H local history.', regionName: 'Tidemark Reach', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' },
    { name: 'Stray', role: 'x', disposition: 'x', backstory: 'Stray local history.', regionName: 'Nowhere', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral', race: 'human', background: 'folk_hero', gender: 'unspecified', class: 'commoner' }
  ],
  storyThread: { title: 'T', state: 'starting', summary: 'S' }
}

export const PRE_EXPANSION_CAMPAIGN_PAYLOAD = {
  regions: [
    { name: 'The Azure Deep', description: 'A new oceanic frontier.', historyBackstory: 'Just discovered.' },
    { name: 'Harbor of First Light', description: 'Explorer port.', historyBackstory: 'Built last season.' }
  ],
  npcs: [
    {
      name: 'Captain Reyes',
      role: 'explorer',
      backstory: 'Reyes has led three voyages into the Azure Deep.',
      disposition: 'Offers a charter if the party surveys the reef.',
      regionName: 'The Azure Deep',
      temperament: 'cunning',
      canSpeak: true,
      alignment: 'chaotic_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    },
    {
      name: 'Sister Mael',
      role: 'chronicler',
      backstory: 'Sister Mael records the first landings for the temple archives.',
      disposition: 'Seeks witnesses to the first landing.',
      regionName: 'Harbor of First Light',
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    }
  ],
  story_thread: {
    title: 'Ventures on the New Ocean',
    state: 'starting',
    summary: 'Explorers push into uncharted waters.'
  }
}

export const LEGACY_CAMPAIGN_SEED_PAYLOAD = {
  regions: [
    { name: 'The Azure Deep', description: 'A newly charted oceanic region.', historyBackstory: 'Sailors only recently proved it navigable.' },
    { name: 'Harbor of First Light', description: 'The explorer port.', historyBackstory: 'Founded to support the first voyages.' }
  ],
  npcs: [
    {
      name: 'Captain Reyes',
      role: 'explorer',
      backstory: 'Reyes has led three voyages into the Azure Deep.',
      disposition: 'Offers a charter if the party surveys the reef.',
      regionName: 'The Azure Deep',
      temperament: 'cunning',
      canSpeak: true,
      alignment: 'chaotic_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    },
    {
      name: 'Sister Mael',
      role: 'chronicler',
      backstory: 'Sister Mael records the first landings for the temple archives.',
      disposition: 'Seeks witnesses to the first landing.',
      regionName: 'Harbor of First Light',
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    }
  ],
  story_thread: {
    title: 'Ventures on the New Ocean',
    state: 'starting',
    summary: 'Explorers push into uncharted waters.'
  }
}
