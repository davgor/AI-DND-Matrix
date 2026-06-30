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
      alignment: 'true_neutral'
    },
    {
      name: `${prefix} Two`,
      role: 'merchant',
      backstory: `${prefix} Two runs a modest stall in ${regionName}.`,
      disposition: 'curious hook',
      regionName,
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: `${prefix} Three`,
      role: 'guard',
      backstory: `${prefix} Three keeps watch on the roads near ${regionName}.`,
      disposition: 'wary hook',
      regionName,
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral'
    }
  ]
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
      alignment: 'chaotic_good'
    },
    {
      name: 'Mara',
      role: 'navigator',
      disposition: 'curious hook',
      backstory: 'Mara charts reefs for any crew that will hire her.',
      regionName: 'azure expanse',
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: 'Jon',
      role: 'diver',
      disposition: 'grim hook',
      backstory: 'Jon salvage-dives wrecks along the Azure Expanse.',
      regionName: 'Azure Expanse',
      temperament: 'cautious',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'Pell',
      role: 'harbor master',
      disposition: 'wary hook',
      backstory: 'Pell keeps order on the Tidemark docks.',
      regionName: 'Tidemark Reach',
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral'
    },
    {
      name: 'Sera',
      role: 'merchant',
      disposition: 'friendly hook',
      backstory: 'Sera trades rope and sailcloth to passing crews.',
      regionName: 'Tidemark Reach',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: 'Vik',
      role: 'guard',
      disposition: 'stern hook',
      backstory: 'Vik served on a coastal patrol before retiring to harbor watch.',
      regionName: 'Tidemark Reach',
      temperament: 'aggressive',
      canSpeak: true,
      alignment: 'lawful_evil'
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
    { name: 'A', role: 'a', disposition: 'a', backstory: 'A local history.', regionName: 'Azure Expanse', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' },
    { name: 'B', role: 'b', disposition: 'b', backstory: 'B local history.', regionName: 'Azure Expanse', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' },
    { name: 'C', role: 'c', disposition: 'c', backstory: 'C local history.', regionName: 'Azure Expanse', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' },
    { name: 'D', role: 'd', disposition: 'd', backstory: 'D local history.', regionName: 'Azure Expanse', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' },
    { name: 'E', role: 'e', disposition: 'e', backstory: 'E local history.', regionName: 'Tidemark Reach', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' },
    { name: 'F', role: 'f', disposition: 'f', backstory: 'F local history.', regionName: 'Tidemark Reach', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' },
    { name: 'G', role: 'g', disposition: 'g', backstory: 'G local history.', regionName: 'Tidemark Reach', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' },
    { name: 'H', role: 'h', disposition: 'h', backstory: 'H local history.', regionName: 'Tidemark Reach', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' },
    { name: 'Stray', role: 'x', disposition: 'x', backstory: 'Stray local history.', regionName: 'Nowhere', temperament: 'neutral', canSpeak: true, alignment: 'true_neutral' }
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
      alignment: 'chaotic_good'
    },
    {
      name: 'Sister Mael',
      role: 'chronicler',
      backstory: 'Sister Mael records the first landings for the temple archives.',
      disposition: 'Seeks witnesses to the first landing.',
      regionName: 'Harbor of First Light',
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
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
      alignment: 'chaotic_good'
    },
    {
      name: 'Sister Mael',
      role: 'chronicler',
      backstory: 'Sister Mael records the first landings for the temple archives.',
      disposition: 'Seeks witnesses to the first landing.',
      regionName: 'Harbor of First Light',
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
    }
  ],
  story_thread: {
    title: 'Ventures on the New Ocean',
    state: 'starting',
    summary: 'Explorers push into uncharted waters.'
  }
}
