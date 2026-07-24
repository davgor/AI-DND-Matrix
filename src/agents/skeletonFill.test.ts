import { describe, expect, it } from 'vitest'
import {
  extractLabeledBlocks,
  fillSkeleton,
  fillSkeletonFromValues,
  formatLabeledBlocks,
  SKELETON_FILL_PROMPT_RULES
} from './skeletonFill'

describe('extractLabeledBlocks happy path', () => {
  it('extracts multiple labeled blocks from raw text', () => {
    const raw = [
      'Sure, here you go:',
      '<<<WORLD_NAME>>>',
      'Eldergloom',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'A misty valley.',
      '<<</WORLD_SUMMARY>>>'
    ].join('\n')
    expect(extractLabeledBlocks(raw)).toEqual({
      ok: true,
      values: {
        WORLD_NAME: 'Eldergloom',
        WORLD_SUMMARY: 'A misty valley.'
      }
    })
  })
})

describe('extractLabeledBlocks unclosed and mismatched tags', () => {
  it('fails on unclosed tags', () => {
    const raw = '<<<WORLD_NAME>>>\nEldergloom\n'
    const result = extractLabeledBlocks(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('unclosed_tag')
      expect(result.token).toBe('WORLD_NAME')
    }
  })

  it('fails on mismatched close tags when not lenient', () => {
    const raw = '<<<WORLD_NAME>>>\nEldergloom\n<<</WORLD_SUMMARY>>>'
    const result = extractLabeledBlocks(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('malformed_tag')
    }
  })
})

describe('extractLabeledBlocks lenient mode', () => {
  it('lenient mode ends a block at the next open or orphan close', () => {
    const raw = [
      '<<<DEITY_0_NAME>>>',
      'Storm Maker',
      '<<<DEITY_0_EPITHET>>>',
      'Thunder',
      '<<</DEITY_0_NAME>>>'
    ].join('\n')
    const result = extractLabeledBlocks(raw, {
      allowedTokens: ['DEITY_0_NAME', 'DEITY_0_EPITHET'],
      lenient: true
    })
    expect(result).toEqual({
      ok: true,
      values: {
        DEITY_0_NAME: 'Storm Maker',
        DEITY_0_EPITHET: 'Thunder'
      }
    })
  })

  it('lenient mode treats EOF as an implicit close when tags are never closed', () => {
    const raw = [
      '<<<PANTHEON_SUMMARY>>>',
      'Gods watch the colony.',
      '<<<DEITY_0>>>',
      'name: Alar',
      'epithet: Forgeheart',
      'domains: war, harvest',
      'tenets: forge, cultivate, learn, share',
      'blurb: Alar inspires miners.'
    ].join('\n')
    const result = extractLabeledBlocks(raw, {
      allowedTokens: ['PANTHEON_SUMMARY', 'DEITY_0'],
      lenient: true
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.values.PANTHEON_SUMMARY).toBe('Gods watch the colony.')
    expect(result.values.DEITY_0).toContain('name: Alar')
    expect(result.values.DEITY_0).toContain('blurb: Alar inspires miners.')
  })
})

describe('extractLabeledBlocks duplicate tokens', () => {
  it('fails on duplicate tokens', () => {
    const raw = [
      '<<<WORLD_NAME>>>',
      'A',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_NAME>>>',
      'B',
      '<<</WORLD_NAME>>>'
    ].join('\n')
    const result = extractLabeledBlocks(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('duplicate_token')
      expect(result.token).toBe('WORLD_NAME')
    }
  })
})

const WORLD_SKELETON = JSON.stringify({
  worldName: '{{WORLD_NAME}}',
  worldSummary: '{{WORLD_SUMMARY}}'
})

describe('fillSkeleton happy path', () => {
  it('fills all placeholders from labeled blocks', () => {
    const raw = [
      '<<<WORLD_NAME>>>',
      'Eldergloom',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'Fog clings to the ridges.',
      '<<</WORLD_SUMMARY>>>'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'Eldergloom',
      worldSummary: 'Fog clings to the ridges.'
    })
  })

  it('tolerates prose noise around tags', () => {
    const raw = [
      'Okay, filling the skeleton now.',
      '',
      '<<<WORLD_NAME>>>',
      'Tyria',
      '<<</WORLD_NAME>>>',
      'Some commentary the model adds.',
      '<<<WORLD_SUMMARY>>>',
      'A bright coast.',
      '<<</WORLD_SUMMARY>>>',
      'Done!'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'Tyria',
      worldSummary: 'A bright coast.'
    })
  })
})

describe('fillSkeleton repeated placeholders', () => {
  it('replaces every occurrence of a repeated placeholder', () => {
    const repeated = '{"a":"{{NAME}}","b":"{{NAME}}"}'
    const raw = ['<<<NAME>>>', 'Twin', '<<</NAME>>>'].join('\n')
    const result = fillSkeleton(repeated, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({ a: 'Twin', b: 'Twin' })
  })
})

describe('fillSkeletonFromValues', () => {
  it('loads a token map into the skeleton without re-parsing raw text', () => {
    const result = fillSkeletonFromValues(WORLD_SKELETON, {
      WORLD_NAME: 'Eldergloom',
      WORLD_SUMMARY: 'Fog.'
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'Eldergloom',
      worldSummary: 'Fog.'
    })
  })
})

describe('fillSkeleton failures', () => {
  it('fails when a required placeholder token is missing', () => {
    const raw = ['<<<WORLD_NAME>>>', 'Eldergloom', '<<</WORLD_NAME>>>'].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('missing_token')
      expect(result.token).toBe('WORLD_SUMMARY')
    }
  })

  it('fails on malformed or unclosed tags when strict extract is used', () => {
    const unclosed = extractLabeledBlocks('<<<WORLD_NAME>>>\nstuck')
    expect(unclosed.ok).toBe(false)
    if (!unclosed.ok) {
      expect(unclosed.reason).toBe('unclosed_tag')
    }
  })

  it('lenient fillSkeleton treats a lone open tag as EOF-closed then reports missing siblings', () => {
    const result = fillSkeleton(WORLD_SKELETON, '<<<WORLD_NAME>>>\nstuck')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('missing_token')
      expect(result.token).toBe('WORLD_SUMMARY')
    }
  })
})

const THREE_FIELD_WORLD_SKELETON = JSON.stringify({
  worldName: '{{WORLD_NAME}}',
  worldSummary: '{{WORLD_SUMMARY}}',
  worldHistory: '{{WORLD_HISTORY}}'
})

function orphanCloseWorldSummaryDump(): string {
  return [
    '<<<WORLD_NAME>>>',
    'Mistmarsh',
    '<<</WORLD_NAME>>>',
    'In the shadowy expanse of Mistmarsh, ancient ruins loom under the mists.',
    'Guilds maintain order while winter seeps through stone walls and broken halls.',
    '<<</WORLD_SUMMARY>>>',
    '<<<WORLD_HISTORY>>>',
    'In the distant past the realm was verdant and prosperous under the pantheon.',
    'Guilds rose from the ruins and clashed as winter returned to the land.',
    'The present feels unstable under iron-fisted rule and forgotten magics.',
    '<<</WORLD_HISTORY>>>'
  ].join('\n')
}

function trailingProseWorldHistoryDump(): string {
  return [
    '<<<WORLD_NAME>>>',
    'Mistmarsh',
    '<<</WORLD_NAME>>>',
    '<<<WORLD_SUMMARY>>>',
    'In the world of Mistmarsh, guilds vie for control as winter closes in.',
    'The faithful seek guidance while an ancient evil stirs in the north.',
    '<<</WORLD_SUMMARY>>>',
    'The fractured realm was once prosperous under the ancient pantheon of gods.',
    'A great war known as the Searing scattered temples and forgot many deities.',
    'Guilds emerged as new powers over war, magic, knowledge, and harvest.',
    'Recent epochs brought strife, and the present feels unstable and contested.'
  ].join('\n')
}

describe('fillSkeleton orphan prose between labeled blocks', () => {
  it('assigns prose before an orphan <<</WORLD_SUMMARY>>> close to WORLD_SUMMARY', () => {
    const result = fillSkeleton(THREE_FIELD_WORLD_SKELETON, orphanCloseWorldSummaryDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = JSON.parse(result.jsonText) as {
      worldName: string
      worldSummary: string
      worldHistory: string
    }
    expect(parsed.worldName).toBe('Mistmarsh')
    expect(parsed.worldSummary).toContain('shadowy expanse')
    expect(parsed.worldHistory).toContain('distant past')
  })

  it('assigns trailing prose after WORLD_SUMMARY to missing WORLD_HISTORY', () => {
    const result = fillSkeleton(THREE_FIELD_WORLD_SKELETON, trailingProseWorldHistoryDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = JSON.parse(result.jsonText) as {
      worldName: string
      worldSummary: string
      worldHistory: string
    }
    expect(parsed.worldName).toBe('Mistmarsh')
    expect(parsed.worldSummary).toContain('guilds vie for control')
    expect(parsed.worldHistory).toContain('Searing')
  })
})

function placeholderHeaderWorldDump(): string {
  return [
    '{{WORLD_NAME}}',
    'Mistmarsh',
    '',
    '{{WORLD_SUMMARY}}',
    'In the heart of Mistmarsh, a foggy marshland binds the living to whispered gods.',
    'People live in vigilance among twisted trees and hidden paths.',
    '',
    '{{WORLD_HISTORY}}',
    'In the dawn of time the gods shaped the marsh and its first people.',
    'Guilds rose and fractured after a war that withdrew divine blessings.',
    'Today the marsh is unstable, torn by banditry and forgotten powers.'
  ].join('\n')
}

function duplicateWorldNameHeaderDump(): string {
  return [
    '{{WORLD_NAME}}',
    'The world of Vaelismar is a place where ancient gods whisper through foggy marshes.',
    '{{WORLD_SUMMARY}}',
    'A marsh summary with enough prose for the faithful.',
    '{{WORLD_HISTORY}}',
    'Ancient history spans epochs of gods and guilds.',
    '{{WORLD_NAME}}',
    'Vaelismar'
  ].join('\n')
}

describe('fillSkeleton {{TOKEN}} section headers (live world dumps)', () => {
  it('retrieves strings when the model uses skeleton placeholders as section headers', () => {
    const result = fillSkeleton(THREE_FIELD_WORLD_SKELETON, placeholderHeaderWorldDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'Mistmarsh',
      worldSummary:
        'In the heart of Mistmarsh, a foggy marshland binds the living to whispered gods.\nPeople live in vigilance among twisted trees and hidden paths.',
      worldHistory:
        'In the dawn of time the gods shaped the marsh and its first people.\nGuilds rose and fractured after a war that withdrew divine blessings.\nToday the marsh is unstable, torn by banditry and forgotten powers.'
    })
  })

  it('prefers a short {{WORLD_NAME}} body when an earlier header captured a long prose dump', () => {
    const result = fillSkeleton(THREE_FIELD_WORLD_SKELETON, duplicateWorldNameHeaderDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText).worldName).toBe('Vaelismar')
  })
})

const BESTIARY_SKELETON = [
  '{"foes":[{',
  '"name":"{{FOE_0_NAME}}",',
  '"buckets":{{@FOE_0_BUCKETS}},',
  '"tags":{{@FOE_0_TAGS}},',
  '"lore":"{{FOE_0_LORE}}"',
  '}]}'
].join('')

function bestiaryTwoCloserDump(): string {
  return [
    '<<<FOE_0_NAME>>>',
    'Grim Howlers',
    '<<</FOE_0_NAME>>',
    '<<<FOE_0_BUCKETS>>>',
    '["monsters", "werewolves", "upright", "wilderness"]',
    '<<</FOE_0_BUCKETS>>',
    '<<<FOE_0_TAGS>>>',
    '["upright_wolves", "werewolf"]',
    '<<</FOE_0_TAGS>>',
    '<<<FOE_0_LORE>>>',
    'Grim Howlers hunt refugees among the ruins of Tharos.',
    '<<</FOE_0_LORE>>'
  ].join('\n')
}

function bestiaryHeaderProseDump(): string {
  return [
    '{{FOE_0_NAME}}',
    'The Ruined Guardian',
    '{{@FOE_0_BUCKETS}}',
    '["beast", "monster"]',
    '{{@FOE_0_TAGS}}',
    '["monastery-ruins"]',
    '',
    'The Ruined Guardian patrols the shattered halls.',
    '{{FOE_0_LORE}}',
    'The Ruined Guardian is a formidable foe born of Tharos.'
  ].join('\n')
}

describe('fillSkeleton bestiary-shaped dumps (165)', () => {
  it('accepts close tags with only two trailing > and keeps raw JSON clean', () => {
    const result = fillSkeleton(BESTIARY_SKELETON, bestiaryTwoCloserDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = JSON.parse(result.jsonText) as {
      foes: Array<{ name: string; buckets: string[]; tags: string[]; lore: string }>
    }
    expect(parsed.foes[0]?.name).toBe('Grim Howlers')
    expect(parsed.foes[0]?.buckets).toEqual(['monsters', 'werewolves', 'upright', 'wilderness'])
    expect(parsed.foes[0]?.tags).toEqual(['upright_wolves', 'werewolf'])
    expect(parsed.foes[0]?.lore).toContain('Grim Howlers hunt')
  })

  it('coerces {{@FOE_0_BUCKETS}} header bodies that include trailing lore prose', () => {
    const result = fillSkeleton(BESTIARY_SKELETON, bestiaryHeaderProseDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = JSON.parse(result.jsonText) as {
      foes: Array<{ name: string; buckets: string[]; tags: string[]; lore: string }>
    }
    expect(parsed.foes[0]?.name).toBe('The Ruined Guardian')
    expect(parsed.foes[0]?.buckets).toEqual(['beast', 'monster'])
    expect(parsed.foes[0]?.tags).toEqual(['monastery-ruins'])
    expect(parsed.foes[0]?.lore).toContain('formidable foe')
  })
})

const REGIONS_SKELETON = JSON.stringify({
  regions: [
    {
      name: '{{REGION_0_NAME}}',
      description: '{{REGION_0_DESCRIPTION}}',
      historyBackstory: '{{REGION_0_HISTORY_BACKSTORY}}',
      recentHistory: '{{REGION_0_RECENT_HISTORY}}',
      potentialQuests: ['{{REGION_0_QUEST_0}}', '{{REGION_0_QUEST_1}}']
    },
    {
      name: '{{REGION_1_NAME}}',
      description: '{{REGION_1_DESCRIPTION}}',
      historyBackstory: '{{REGION_1_HISTORY_BACKSTORY}}',
      recentHistory: '{{REGION_1_RECENT_HISTORY}}',
      potentialQuests: ['{{REGION_1_QUEST_0}}', '{{REGION_1_QUEST_1}}']
    }
  ]
})

function remappedRegionNameDump(): string {
  return [
    '<<<REGION_0_NAME>>>',
    'Riverlands',
    '<<</REGION_0_NAME>>>',
    'Rivers converge into a fertile plain of markets and ruins.',
    '<<<REGION_0_HISTORY_BACKSTORY>>>',
    'Founded along the Eldoria confluence after the Stormbringers war.',
    '<<<REGION_0_RECENT_HISTORY>>>',
    'Guild auctions now decide who holds the river relics.',
    '<<<REGION_0_QUEST_0>>>',
    'Recover a looted temple relic.',
    '<<<REGION_0_QUEST_1>>>',
    'Trace a suspicious cliffside shipment.',
    '<<<REGION_0_NAME>>>',
    'Coastal Cliffs',
    '<<</REGION_0_NAME>>>',
    'Salt spray and steep paths mark the storm-wracked shore.',
    '<<<REGION_1_HISTORY_BACKSTORY>>>',
    'Stormhold rose under Gormar after settlers braved the cliffs.',
    '<<<REGION_1_RECENT_HISTORY>>>',
    'Forgotten deities whisper louder with every wreck.',
    '<<<REGION_1_QUEST_0>>>',
    'Chart a safe cove for refugee boats.',
    '<<<REGION_1_QUEST_1>>>',
    'Bargain with cliffside smugglers.'
  ].join('\n')
}

function overflowRegionNameDump(): string {
  return [
    '<<<REGION_0_NAME>>>',
    'Riverlands',
    'The Riverlands of Mistmarsh are the heart of the kingdom.',
    'Towns bustle along the converging waterways.',
    '<<<REGION_0_HISTORY_BACKSTORY>>>',
    'Settlers followed the rivers from the Coastal Cliffs.',
    '<<<REGION_0_RECENT_HISTORY>>>',
    'Merchant guilds now eclipse the old temple houses.',
    '<<<REGION_0_QUEST_0>>>',
    'Retrieve a sacred artifact from a looted temple.',
    '<<<REGION_0_QUEST_1>>>',
    'Investigate a mysterious coastal shipment.',
    '<<<REGION_1_NAME>>>',
    'Coastal Cliffs',
    'Rugged shores meet inland rivers in briny mist.',
    '<<<REGION_1_HISTORY_BACKSTORY>>>',
    'Cliff settlements lived by tide and storm.',
    '<<<REGION_1_RECENT_HISTORY>>>',
    'Storms grow worse as forgotten gods stir.',
    '<<<REGION_1_QUEST_0>>>',
    'Rescue fishers from a cliff collapse.',
    '<<<REGION_1_QUEST_1>>>',
    'Seal a sea cave used by raiders.'
  ].join('\n')
}

function potentialQuestsTypoDump(): string {
  return [
    '<<<REGION_0_NAME>>>',
    'Shadowspire',
    '<<<REGION_0_DESCRIPTION>>>',
    'A shadowy river district of guilds and secrets.',
    '<<<REGION_0_HISTORY_BACKSTORIY>>>',
    'Founded by followers of a forgotten river god.',
    '<<<REGION_0_RECENT_HISTORY>>>',
    'Ruins exposure has made the district unstable.',
    '<<<REGION_0_POTENTIAL_QUESTS>>>',
    '- Investigate a vanished guild master in Shadowspire.',
    '- Seek a hidden temple beneath the river.',
    '<<<REGION_1_NAME>>>',
    'Hearthglow',
    '<<<REGION_1_DESCRIPTION>>>',
    'Warm hearths keep the desert city alive.',
    '<<<REGION_1_HISTORY_BACKSTORY>>>',
    'Hearthtenders built the district as a refuge.',
    '<<<REGION_1_RECENT_HISTORY>>>',
    'Hearths malfunction as strange creatures appear.',
    '<<<REGION_1_POTENTIAL_QUESTS>>>',
    '- Repair a failing great hearth before nightfall.',
    '- Escort pilgrims through the cold outbreak wards.'
  ].join('\n')
}

describe('fillSkeleton regions remap reused REGION_0 tags (165)', () => {
  it('remaps a reused REGION_0_NAME tag to REGION_1_NAME', () => {
    const result = fillSkeleton(REGIONS_SKELETON, remappedRegionNameDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = JSON.parse(result.jsonText) as {
      regions: Array<{ name: string; description: string }>
    }
    expect(parsed.regions[0]?.name).toBe('Riverlands')
    expect(parsed.regions[0]?.description).toContain('fertile plain')
    expect(parsed.regions[1]?.name).toBe('Coastal Cliffs')
    expect(parsed.regions[1]?.description).toContain('Salt spray')
  })
})

describe('fillSkeleton regions empty remap dump (168)', () => {
  it('ignores empty mid REGION_0_NAME and keeps real REGION_1_NAME', async () => {
    const { liveRegionsEmptyRemapDump } = await import(
      './campaignGeneration/liveRegionsDumps'
    )
    const result = fillSkeleton(REGIONS_SKELETON, liveRegionsEmptyRemapDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = JSON.parse(result.jsonText) as {
      regions: Array<{ name: string; historyBackstory: string }>
    }
    expect(parsed.regions[0]?.name).toBe('Flooded Marshes')
    expect(parsed.regions[1]?.name).toBe('Ruined Cities')
    expect(parsed.regions[0]?.historyBackstory).toContain('Eldara')
    expect(parsed.regions[1]?.historyBackstory).toContain('Morn')
  })
})

describe('fillSkeleton regions overflow NAME into DESCRIPTION (165)', () => {
  it('splits overflow REGION_0_NAME prose into DESCRIPTION', () => {
    const result = fillSkeleton(REGIONS_SKELETON, overflowRegionNameDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = JSON.parse(result.jsonText) as {
      regions: Array<{ name: string; description: string }>
    }
    expect(parsed.regions[0]?.name).toBe('Riverlands')
    expect(parsed.regions[0]?.description).toContain('heart of the kingdom')
  })
})

describe('fillSkeleton regions POTENTIAL_QUESTS and typos (165)', () => {
  it('maps REGION_N_POTENTIAL_QUESTS and HISTORY_BACKSTORIY typos into skeleton tokens', () => {
    const result = fillSkeleton(REGIONS_SKELETON, potentialQuestsTypoDump())
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = JSON.parse(result.jsonText) as {
      regions: Array<{
        name: string
        historyBackstory: string
        potentialQuests: string[]
      }>
    }
    expect(parsed.regions[0]?.name).toBe('Shadowspire')
    expect(parsed.regions[0]?.historyBackstory).toContain('forgotten river god')
    expect(parsed.regions[0]?.potentialQuests[0]).toContain('guild master')
    expect(parsed.regions[0]?.potentialQuests[1]).toContain('hidden temple')
    expect(parsed.regions[1]?.potentialQuests[0]).toContain('great hearth')
  })
})

describe('fillSkeleton ignores unknown extras', () => {
  it('ignores unknown extra tokens when all skeleton placeholders are filled', () => {
    const raw = [
      '<<<WORLD_NAME>>>',
      'Eldergloom',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'Fog.',
      '<<</WORLD_SUMMARY>>>',
      '<<<EXTRA_FIELD>>>',
      'nope',
      '<<</EXTRA_FIELD>>>'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'Eldergloom',
      worldSummary: 'Fog.'
    })
  })

  it('ignores echoed <<<TOKEN>>> value text here prompt-template blocks', () => {
    const raw = [
      '<<<TOKEN>>>',
      'value text here',
      '<<</TOKEN>>>',
      '<<<TOKEN>>>',
      'value text here',
      '<<</TOKEN>>>',
      '<<<WORLD_NAME>>>',
      'Mearsthorpe',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'A salt port by glowing quarries.',
      '<<</WORLD_SUMMARY>>>'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'Mearsthorpe',
      worldSummary: 'A salt port by glowing quarries.'
    })
  })
})

describe('fillSkeleton escape policy', () => {
  it('JSON-escapes quotes and control chars so JSON.parse succeeds', () => {
    const raw = [
      '<<<WORLD_NAME>>>',
      'O\'Brien "the Bold"',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'Line one.\nLine two.\tTabbed.',
      '<<</WORLD_SUMMARY>>>'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(() => JSON.parse(result.jsonText)).not.toThrow()
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'O\'Brien "the Bold"',
      worldSummary: 'Line one.\nLine two.\tTabbed.'
    })
  })

  it('inserts raw JSON fragments for {{@TOKEN}} placeholders', () => {
    const skeleton = '{"ok":{{@FLAG}},"items":{{@ITEMS}}}'
    const raw = formatLabeledBlocks({
      FLAG: 'true',
      ITEMS: '["a","b"]'
    })
    const result = fillSkeleton(skeleton, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({ ok: true, items: ['a', 'b'] })
  })
})

describe('SKELETON_FILL_PROMPT_RULES', () => {
  it('does not use a copyable <<<TOKEN>>> / value text here template', () => {
    expect(SKELETON_FILL_PROMPT_RULES).not.toContain('<<<TOKEN>>>')
    expect(SKELETON_FILL_PROMPT_RULES).not.toContain('value text here')
    expect(SKELETON_FILL_PROMPT_RULES).toContain('exact placeholder name')
    expect(SKELETON_FILL_PROMPT_RULES).toContain('Never emit a literal tag named TOKEN')
  })
})
