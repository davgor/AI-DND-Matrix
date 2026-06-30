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
      alignment: 'true_neutral'
    }
  ]
}

export const SINGLE_NPC_PAYLOAD = JSON.stringify({
  npc: {
    name: 'Rook',
    role: 'hermit',
    backstory: 'Rook lives in the fog.',
    disposition: 'gruff',
    regionName: 'Mistfen',
    temperament: 'cautious',
    canSpeak: true,
    alignment: 'true_neutral'
  }
})
