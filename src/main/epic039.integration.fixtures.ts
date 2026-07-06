export function makeRegion(name: string) {
  return {
    name,
    description: `Description of ${name}.`,
    historyBackstory: `History of ${name}.`,
    recentHistory: `Recent events in ${name}.`,
    potentialQuests: [`Quest in ${name}`, `Another quest in ${name}`]
  }
}

export function makeNpcs(regionName: string, prefix: string) {
  return [
    {
      name: `${prefix} One`,
      role: 'guide',
      backstory: `${prefix} One has lived in ${regionName} for years.`,
      disposition: 'friendly',
      regionName,
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    }
  ]
}

export const SINGLE_NPC_CORE_BUNDLE = JSON.stringify({
  canSpeak: true,
  temperament: 'cautious',
  race: 'human',
  gender: 'unspecified',
  alignment: 'true_neutral',
  class: 'commoner',
  background: 'hermit'
})

export const SINGLE_NPC_FINAL = JSON.stringify({
  name: 'Rook',
  role: 'hermit',
  backstory: 'Rook lives in the fog.',
  disposition: 'gruff'
})
