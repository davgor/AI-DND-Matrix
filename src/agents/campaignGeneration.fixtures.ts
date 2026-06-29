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
      disposition: 'friendly hook',
      regionName,
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: `${prefix} Two`,
      role: 'merchant',
      disposition: 'curious hook',
      regionName,
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: `${prefix} Three`,
      role: 'guard',
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
      regionName: 'Azure Expanse',
      temperament: 'cunning',
      canSpeak: true,
      alignment: 'chaotic_good'
    },
    {
      name: 'Mara',
      role: 'navigator',
      disposition: 'curious hook',
      regionName: 'azure expanse',
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: 'Jon',
      role: 'diver',
      disposition: 'grim hook',
      regionName: 'Azure Expanse',
      temperament: 'cautious',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'Pell',
      role: 'harbor master',
      disposition: 'wary hook',
      regionName: 'Tidemark Reach',
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral'
    },
    {
      name: 'Sera',
      role: 'merchant',
      disposition: 'friendly hook',
      regionName: 'Tidemark Reach',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: 'Vik',
      role: 'guard',
      disposition: 'stern hook',
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
    {
      name: 'A',
      role: 'a',
      disposition: 'a',
      regionName: 'Azure Expanse',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'B',
      role: 'b',
      disposition: 'b',
      regionName: 'Azure Expanse',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'C',
      role: 'c',
      disposition: 'c',
      regionName: 'Azure Expanse',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'D',
      role: 'd',
      disposition: 'd',
      regionName: 'Azure Expanse',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'E',
      role: 'e',
      disposition: 'e',
      regionName: 'Tidemark Reach',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'F',
      role: 'f',
      disposition: 'f',
      regionName: 'Tidemark Reach',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'G',
      role: 'g',
      disposition: 'g',
      regionName: 'Tidemark Reach',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'H',
      role: 'h',
      disposition: 'h',
      regionName: 'Tidemark Reach',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: 'Stray',
      role: 'x',
      disposition: 'x',
      regionName: 'Nowhere',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    }
  ],
  storyThread: { title: 'T', state: 'starting', summary: 'S' }
}
