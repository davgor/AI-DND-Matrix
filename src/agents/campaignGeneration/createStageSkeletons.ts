const DEFAULT_BESTIARY_FOE_SLOTS = 3

/** Canon recall — lists/boolean as raw JSON fragments ({{@TOKEN}}). */
export function buildCanonSkeletonJson(): string {
  return [
    '{',
    '"recognizedSetting":{{@RECOGNIZED_SETTING}},',
    '"settingLabel":"{{SETTING_LABEL}}",',
    '"knownPlaces":{{@KNOWN_PLACES}},',
    '"knownCharacters":{{@KNOWN_CHARACTERS}},',
    '"knownDeities":{{@KNOWN_DEITIES}}',
    '}'
  ].join('')
}

export function buildRegionsSkeletonJson(regionCount: number): string {
  if (regionCount === 0) {
    return '{"regions":[]}'
  }
  const regions = []
  for (let index = 0; index < regionCount; index += 1) {
    regions.push({
      name: `{{REGION_${index}_NAME}}`,
      description: `{{REGION_${index}_DESCRIPTION}}`,
      historyBackstory: `{{REGION_${index}_HISTORY_BACKSTORY}}`,
      recentHistory: `{{REGION_${index}_RECENT_HISTORY}}`,
      potentialQuests: [`{{REGION_${index}_QUEST_0}}`, `{{REGION_${index}_QUEST_1}}`]
    })
  }
  return JSON.stringify({ regions })
}

export function buildStoryThreadSkeletonJson(): string {
  return JSON.stringify({
    storyThread: {
      title: '{{STORY_TITLE}}',
      state: 'starting',
      summary: '{{STORY_SUMMARY}}'
    }
  })
}

export function buildBestiarySkeletonJson(foeCount: number = DEFAULT_BESTIARY_FOE_SLOTS): string {
  const foeJson = Array.from({ length: foeCount }, (_, index) =>
    [
      '{',
      `"name":"{{FOE_${index}_NAME}}",`,
      `"buckets":{{@FOE_${index}_BUCKETS}},`,
      `"tags":{{@FOE_${index}_TAGS}},`,
      `"lore":"{{FOE_${index}_LORE}}"`,
      '}'
    ].join('')
  ).join(',')
  return `{"foes":[${foeJson}]}`
}

export function buildSingleNpcSkeletonJson(regionName: string): string {
  return JSON.stringify({
    npc: {
      name: '{{NPC_NAME}}',
      role: '{{NPC_ROLE}}',
      backstory: '{{NPC_BACKSTORY}}',
      disposition: '{{NPC_DISPOSITION}}',
      regionName,
      temperament: '{{NPC_TEMPERAMENT}}',
      canSpeak: true,
      alignment: '{{NPC_ALIGNMENT}}',
      race: '{{NPC_RACE}}',
      background: '{{NPC_BACKGROUND}}',
      gender: '{{NPC_GENDER}}',
      class: '{{NPC_CLASS}}'
    }
  })
}

export function buildAdditionalRegionSkeletonJson(npcCount: number): string {
  const npcs = []
  for (let index = 0; index < npcCount; index += 1) {
    npcs.push({
      name: `{{NPC_${index}_NAME}}`,
      role: `{{NPC_${index}_ROLE}}`,
      backstory: `{{NPC_${index}_BACKSTORY}}`,
      disposition: `{{NPC_${index}_DISPOSITION}}`,
      regionName: '{{REGION_NAME}}',
      temperament: `{{NPC_${index}_TEMPERAMENT}}`,
      canSpeak: true,
      alignment: `{{NPC_${index}_ALIGNMENT}}`,
      race: `{{NPC_${index}_RACE}}`,
      background: `{{NPC_${index}_BACKGROUND}}`,
      gender: `{{NPC_${index}_GENDER}}`,
      class: `{{NPC_${index}_CLASS}}`
    })
  }
  // regionName must match across region + npcs — use same placeholder
  const region = {
    name: '{{REGION_NAME}}',
    description: '{{REGION_DESCRIPTION}}',
    historyBackstory: '{{REGION_HISTORY_BACKSTORY}}',
    recentHistory: '{{REGION_RECENT_HISTORY}}',
    potentialQuests: ['{{REGION_QUEST_0}}', '{{REGION_QUEST_1}}']
  }
  return JSON.stringify({ region, npcs })
}
