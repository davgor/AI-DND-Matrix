import type { GeneratedBestiaryFoe, GeneratedNpc } from '../../agents/campaignGeneration/types'
import { formatLabeledBlocks } from '../../agents/skeletonFill'

export function makeRegion(name: string, suffix: string) {
  return {
    name,
    description: `Description of ${name}.`,
    historyBackstory: `Deep history of ${name}.`,
    recentHistory: `Recent events in ${name} (${suffix}).`,
    potentialQuests: [`Quest A in ${name}`, `Quest B in ${name}`]
  }
}

export function makeNpcs(regionName: string, prefix: string): GeneratedNpc[] {
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
    'Tyria is a world of stormy seas, broken islands, and drowned coasts where old empires left only ruins and stubborn freeholds. Trade still crosses the inner seas, but every captain carries charts marked with vanished ports.\n\nHarbor towns tax the same moorings twice while storm priests and salvage cults argue over wreck rights. Farmers watch refugee columns pass on the coastal roads each autumn.\n\nPower is fragmented today — harbor councils, company charters, and free captains all claim legitimacy. The weather still decides who eats when the squall season arrives.',
  worldHistory:
    'Three ages ago the continental shelf cracked during the Sundering, swallowing coastal kingdoms and leaving archipelagos where farmland once stretched to the horizon. Temples rang warning bells for weeks, but the sea still climbed through harbor streets faster than any evacuation plan. Survivors who reached high ground rebuilt as cliff clans who still measure wealth in rope and fresh water.\n\nSalvagers still dredge barnacled crowns and drowned libraries from the inner bays. Scholars argue whether the flood was natural, divine punishment, or sabotage between rival archmages, and every court commissions a different answer. Dredging licenses have become the fastest path to a noble title in port cities.\n\nFor two centuries the Charting Compact mapped safe passages and taxed moorings until guild wars broke the tithe system and beacon fires fell dark. Captains who remembered the old routes became kings of smuggling lanes overnight. The Compact’s seal houses are ruins now, but their ledgers still surface in wreck sales.\n\nIn the last generation explorer crews have pushed past the outer shoals again, returning with cursed ore, missing manifests, and rumors of living reefs that remember every ship that wronged them. Few crews return with the same crew count they left with. Insurance brokers on the inner quay have doubled their rates twice in five years.\n\nToday the inner sea routes are contested again — not by emperors alone, but by storm priests, smuggler princes, and captains who swear the drowned still vote on every treaty. Festival markets flourish beside famine roads, and everyone knows the next squall may rewrite the map. Beacon chains are relit one tower at a time, always too late for someone.'
}

export function worldLabeledBlocks(world: {
  worldName: string
  worldSummary: string
  worldHistory: string
}): string {
  return formatLabeledBlocks({
    WORLD_NAME: world.worldName,
    WORLD_SUMMARY: world.worldSummary,
    WORLD_HISTORY: world.worldHistory
  })
}

/** Empty canon recall — original / unrecognized premise. */
export const EMPTY_CANON_RESPONSE = formatLabeledBlocks({
  RECOGNIZED_SETTING: 'false',
  SETTING_LABEL: '',
  KNOWN_PLACES: '[]',
  KNOWN_CHARACTERS: '[]',
  KNOWN_DEITIES: '[]'
})

export function canonLabeledBlocks(canon: {
  recognizedSetting: boolean
  settingLabel: string
  knownPlaces: string[]
  knownCharacters: string[]
  knownDeities?: string[]
}): string {
  return formatLabeledBlocks({
    RECOGNIZED_SETTING: canon.recognizedSetting ? 'true' : 'false',
    SETTING_LABEL: canon.settingLabel,
    KNOWN_PLACES: JSON.stringify(canon.knownPlaces),
    KNOWN_CHARACTERS: JSON.stringify(canon.knownCharacters),
    KNOWN_DEITIES: JSON.stringify(canon.knownDeities ?? [])
  })
}

export function regionsLabeledBlocks(
  regions: Array<{
    name: string
    description: string
    historyBackstory: string
    recentHistory: string
    potentialQuests: string[]
  }>
): string {
  const values: Record<string, string> = {}
  regions.forEach((region, index) => {
    values[`REGION_${index}_NAME`] = region.name
    values[`REGION_${index}_DESCRIPTION`] = region.description
    values[`REGION_${index}_HISTORY_BACKSTORY`] = region.historyBackstory
    values[`REGION_${index}_RECENT_HISTORY`] = region.recentHistory
    values[`REGION_${index}_QUEST_0`] = region.potentialQuests[0] ?? `Quest A in ${region.name}`
    values[`REGION_${index}_QUEST_1`] = region.potentialQuests[1] ?? `Quest B in ${region.name}`
  })
  return formatLabeledBlocks(values)
}

export function storyLabeledBlocks(thread: { title: string; summary: string }): string {
  return formatLabeledBlocks({
    STORY_TITLE: thread.title,
    STORY_SUMMARY: thread.summary
  })
}

export function bestiaryLabeledBlocks(
  foes: Array<{ name: string; buckets?: string[]; tags?: string[]; lore: string }>
): string {
  const values: Record<string, string> = {}
  foes.forEach((foe, index) => {
    values[`FOE_${index}_NAME`] = foe.name
    values[`FOE_${index}_BUCKETS`] = JSON.stringify(foe.buckets ?? ['beast'])
    values[`FOE_${index}_TAGS`] = JSON.stringify(foe.tags ?? [])
    values[`FOE_${index}_LORE`] = foe.lore
  })
  return formatLabeledBlocks(values)
}

type LabeledNpcFields = {
  name: string
  role: string
  backstory?: string
  disposition: string
  temperament?: string
  alignment?: string
  race?: string
  raceKey?: string
  background?: string
  backgroundKey?: string
  gender?: string
  genderKey?: string
  classKey?: string
  class?: string
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value !== undefined && value !== '') {
      return value
    }
  }
  return undefined
}

function resolveLabeledNpcFields(
  npc: LabeledNpcFields,
  fallbackBackstory: string
): Record<string, string> {
  return {
    name: npc.name,
    role: npc.role,
    backstory: firstDefined(npc.backstory) ?? fallbackBackstory,
    disposition: npc.disposition,
    temperament: firstDefined(npc.temperament) ?? 'balanced',
    alignment: firstDefined(npc.alignment) ?? 'true_neutral',
    race: firstDefined(npc.race, npc.raceKey) ?? 'human',
    background: firstDefined(npc.background, npc.backgroundKey) ?? 'folk_hero',
    gender: firstDefined(npc.gender, npc.genderKey) ?? 'unspecified',
    class: firstDefined(npc.class, npc.classKey) ?? 'commoner'
  }
}

export function singleNpcLabeledBlocks(_regionName: string, npc: LabeledNpcFields): string {
  const fields = resolveLabeledNpcFields(npc, `${npc.name} lives and works nearby.`)
  return formatLabeledBlocks({
    NPC_NAME: fields.name,
    NPC_ROLE: fields.role,
    NPC_BACKSTORY: fields.backstory,
    NPC_DISPOSITION: fields.disposition,
    NPC_TEMPERAMENT: fields.temperament,
    NPC_ALIGNMENT: fields.alignment,
    NPC_RACE: fields.race,
    NPC_BACKGROUND: fields.background,
    NPC_GENDER: fields.gender,
    NPC_CLASS: fields.class
  })
}

export const SHIELD_HERO_CANON = {
  recognizedSetting: true,
  settingLabel: 'The Rising of the Shield Hero',
  knownPlaces: ['Melromarc', 'Siltvelt'],
  knownCharacters: ['Raphtalia', 'Naofumi Iwatani', 'Filo'],
  knownDeities: ['The Three Heroes', 'Ost Hero', 'The Guardian Heroes']
}

function makeDeity(
  name: string,
  options: { forgotten?: boolean; domains?: string[]; epithet?: string } = {}
) {
  return {
    name,
    epithet: options.epithet ?? '',
    domains: options.domains ?? ['fate'],
    tenets: [`Honor ${name}`, `Remember ${name} in quiet hours`],
    blurb: `${name} is a power whose shrines still shape local custom.`,
    isForgotten: options.forgotten ?? false
  }
}

/** Valid 8-deity pantheon object for normalize unit tests (2 forgotten). */
export const VALID_PANTHEON = {
  pantheonSummary:
    'Faith here is a bargain between living temples and ruin chapels. Major cults argue over oaths and wreck rights while quieter shrines keep older names.\n\nAt least two powers are forgotten — remembered only in cracked idols and tide-marked graves.\n\nPriests still warn travelers which names to speak aloud after dark.',
  deities: [
    makeDeity('Vhalor', { epithet: 'the Drowned Judge', domains: ['death', 'tides'] }),
    makeDeity('Sereth', { forgotten: true, epithet: 'the Hollow Flame', domains: ['fire'] }),
    makeDeity('Kaelen', { domains: ['harvest'] }),
    makeDeity('Mirath', { domains: ['knowledge'] }),
    makeDeity('Thorn', { domains: ['trickery'] }),
    makeDeity('Belwyn', { forgotten: true, domains: ['hearth'] }),
    makeDeity('Orrin', { domains: ['storms'] }),
    makeDeity('Lirae', { domains: ['war'] })
  ]
}

/** Extra filler deities so labeled blocks match the 10-slot engine skeleton (161.4). */
const PANTHEON_SKELETON_FILLER = [
  makeDeity('Nyxara', { domains: ['night'] }),
  makeDeity('Durmen', { forgotten: true, domains: ['stone'] })
]

export function pantheonLabeledBlocks(pantheon: {
  pantheonSummary: string
  deities: Array<{
    name: string
    epithet: string
    domains: string[]
    tenets: string[]
    blurb: string
  }>
}): string {
  const parts = [
    `<<<PANTHEON_SUMMARY>>>\n${pantheon.pantheonSummary}\n<<</PANTHEON_SUMMARY>>>`
  ]
  for (let index = 0; index < 10; index += 1) {
    const deity = pantheon.deities[index] ?? PANTHEON_SKELETON_FILLER[index - pantheon.deities.length]!
    parts.push(
      [
        `<<<DEITY_${index}>>>`,
        `name: ${deity.name}`,
        `epithet: ${deity.epithet}`,
        `domains: ${deity.domains.join(', ')}`,
        `tenets: ${deity.tenets.join(', ')}`,
        `blurb: ${deity.blurb}`,
        `<<</DEITY_${index}>>>`
      ].join('\n')
    )
  }
  return parts.join('\n')
}

export const VALID_PANTHEON_RESPONSE = pantheonLabeledBlocks({
  pantheonSummary: VALID_PANTHEON.pantheonSummary,
  deities: [...VALID_PANTHEON.deities, ...PANTHEON_SKELETON_FILLER]
})

/** Medium-pressure faction roster with ≥1 religious + ≥2 relations (125.3 default path). */
export const VALID_MEDIUM_FACTIONS = {
  factionPressure: 'medium' as const,
  factionsSummary:
    'Harbor councils, salvage cults, and smuggler princes contest wreck rights while Vhalor’s temple keeps the drowned oaths. Every dockside bargain has a second ledger.',
  factions: [
    {
      key: 'harbor_council',
      name: 'Harbor Council',
      kind: 'civic' as const,
      summary: 'Port magistrates who tax moorings and quarrel over salvage licenses.',
      motivation: 'Keep the inner sea routes profitable and orderly.',
      publicFace: 'Civic stewards of the quays.',
      methods: 'Tariffs, inspections, and sealed ledgers.',
      sortOrder: 0
    },
    {
      key: 'charting_compact',
      name: 'Charting Compact Remnant',
      kind: 'mercantile' as const,
      summary: 'Surviving beacon crews and insurance brokers who still sell safe-passage charts.',
      sortOrder: 1
    },
    {
      key: 'temple_of_vhalor',
      name: 'Temple of Vhalor',
      kind: 'religious' as const,
      summary: 'Tide priests who judge broken oaths sworn on water.',
      deityName: 'Vhalor',
      sortOrder: 2
    },
    {
      key: 'smuggler_princes',
      name: 'Smuggler Princes',
      kind: 'criminal' as const,
      summary: 'Captains who run dark lanes past the beacon chains.',
      sortOrder: 3
    }
  ],
  relations: [
    {
      factionAKey: 'harbor_council',
      factionBKey: 'smuggler_princes',
      stance: 'rival' as const,
      summary: 'Dock seizures and midnight bribes keep the feud warm.'
    },
    {
      factionAKey: 'temple_of_vhalor',
      factionBKey: 'harbor_council',
      stance: 'tense' as const,
      summary: 'Priests demand wreck tithes the council refuses to cede.'
    }
  ]
}

/** Labeled-block dump matching medium+deities engine skeleton (161.3). */
export const VALID_FACTIONS_RESPONSE = formatLabeledBlocks({
  FACTIONS_SUMMARY: VALID_MEDIUM_FACTIONS.factionsSummary,
  FACTION_0_NAME: 'Harbor Council',
  FACTION_0_SUMMARY: 'Port magistrates who tax moorings and quarrel over salvage licenses.',
  FACTION_1_NAME: 'Charting Compact Remnant',
  FACTION_1_SUMMARY:
    'Surviving beacon crews and insurance brokers who still sell safe-passage charts.',
  FACTION_2_NAME: 'Temple of Vhalor',
  FACTION_2_SUMMARY: 'Tide priests who judge broken oaths sworn on water.',
  FACTION_2_DEITY_NAME: 'Vhalor',
  FACTION_3_NAME: 'Smuggler Princes',
  FACTION_3_SUMMARY: 'Captains who run dark lanes past the beacon chains.',
  RELATION_0_SUMMARY: 'Dock seizures and midnight bribes keep the feud warm.',
  RELATION_1_SUMMARY: 'Priests demand wreck tithes the council refuses to cede.'
})

/** Snake_case object kept for normalize drift unit tests (legacy JSON shape). */
export const REALISTIC_LLM_FACTIONS = {
  faction_pressure: 'medium',
  factions_summary:
    'Caravan leagues, temple wardens, and desert courts trade favors under the Ashen Crown.',
  factions: [
    {
      key: 'ashen_caravan_league',
      name: 'Ashen Caravan League',
      kind: 'mercantile',
      summary: 'Desert traders who schedule every oasis stop.',
      public_face: 'Honest middlemen of the upland road.',
      sort_order: 0
    },
    {
      key: 'crown_watch',
      name: 'Crown Watch',
      kind: 'military',
      summary: 'Frontier riders who seal the pass when winter arrives.',
      sort_order: 1
    },
    {
      key: 'temple_of_vhalor',
      name: 'Temple of Vhalor',
      kind: 'religious',
      summary: 'Oath-keepers who bless caravans before the dunes.',
      deity_name: 'Vhalor',
      sort_order: 2
    },
    {
      key: 'sandglass_cabal',
      name: 'Sandglass Cabal',
      kind: 'clandestine',
      summary: 'Informants who sell envoy routes to the highest bidder.',
      sort_order: 3
    }
  ],
  relations: [
    {
      faction_a_key: 'ashen_caravan_league',
      faction_b_key: 'sandglass_cabal',
      stance: 'rival',
      summary: 'Leaked manifests keep the league hunting spies.'
    },
    {
      faction_a_key: 'temple_of_vhalor',
      faction_b_key: 'crown_watch',
      stance: 'ally',
      summary: 'Priests bless the watch before each winter patrol.'
    }
  ]
}

/** Labeled-block dump for cascading create fixtures (161.3). */
export const REALISTIC_FACTIONS_RESPONSE = formatLabeledBlocks({
  FACTIONS_SUMMARY:
    'Caravan leagues, temple wardens, and desert courts trade favors under the Ashen Crown.',
  FACTION_0_NAME: 'Ashen Caravan League',
  FACTION_0_SUMMARY: 'Desert traders who schedule every oasis stop.',
  FACTION_1_NAME: 'Crown Watch',
  FACTION_1_SUMMARY: 'Frontier riders who seal the pass when winter arrives.',
  FACTION_2_NAME: 'Temple of Vhalor',
  FACTION_2_SUMMARY: 'Oath-keepers who bless caravans before the dunes.',
  FACTION_2_DEITY_NAME: 'Vhalor',
  FACTION_3_NAME: 'Sandglass Cabal',
  FACTION_3_SUMMARY: 'Informants who sell envoy routes to the highest bidder.',
  RELATION_0_SUMMARY: 'Leaked manifests keep the league hunting spies.',
  RELATION_1_SUMMARY: 'Priests bless the watch before each winter patrol.'
})

/** Drift case: prose around tags still succeeds (161.6 precursor). */
export const REALISTIC_FACTIONS_BLOCK_DRIFT_RESPONSE = [
  'Okay, filling the faction skeleton now.',
  REALISTIC_FACTIONS_RESPONSE,
  'Done with factions.'
].join('\n')

/** Default prepped bestiary roster (N>=3 per 116.6). */
export const DEFAULT_BESTIARY_FOES: GeneratedBestiaryFoe[] = [
  {
    name: 'Ash Wolf',
    tags: ['wolf', 'beast'],
    buckets: ['beast'],
    lore:
      'Ash wolves haunt burnt ridgelines where smoke still clings to the scrub. Packs learn caravan schedules faster than scouts admit.'
  },
  {
    name: 'Cave Crawler',
    tags: ['ambush'],
    buckets: ['beast'],
    lore:
      'Cave crawlers cling to damp ceilings and drop when torchlight wobbles. Miners nail iron chimes above shafts so the clicking arrives first.'
  },
  {
    name: 'Bog Wight',
    tags: ['undead', 'mire'],
    buckets: ['undead'],
    lore:
      'Bog wights rise where travelers drowned with unpaid debts still clutched in their fists. Their fog smells like wet coins and regret.'
  }
]

/** Shield Hero / rift fantasy signature foes for cascading fixtures. */
export const SHIELD_HERO_BESTIARY_FOES: GeneratedBestiaryFoe[] = [
  {
    name: 'Blue Slime',
    tags: ['slime'],
    buckets: ['elemental'],
    lore:
      'Blue slimes pool in Wave-scarred ditches, dissolving gear and pride alike. Locals learn to watch for translucent blobs before they learn which gods to curse.'
  },
  {
    name: 'Rift-beast',
    tags: ['rift', 'beast'],
    buckets: ['beast'],
    lore:
      'Rift-beasts claw through dimensional tears when Waves crest, all fang and wrong geometry. Survivors swear their howls arrive a heartbeat before the air splits open.'
  },
  {
    name: 'Wave Spawn',
    tags: ['wave', 'rift'],
    buckets: ['fiend'],
    lore:
      'Wave spawn drip from the same calamities that summon Heroes, half-formed and hungry. They forget nothing of the last Wave except mercy.'
  }
]

export function makeBestiarySeedResponse(foes: GeneratedBestiaryFoe[] = DEFAULT_BESTIARY_FOES): string {
  return bestiaryLabeledBlocks(foes)
}

export function makeSingleNpcPayload(
  regionName: string,
  npc: ReturnType<typeof makeNpcs>[number] & {
    temperament?: string
    alignment?: string
    race?: string
    background?: string
    gender?: string
    class?: string
  }
): string {
  return singleNpcLabeledBlocks(regionName, npc)
}

/** Shield Hero–shaped pantheon preferring knownDeities names. */
export const SHIELD_HERO_PANTHEON = {
  pantheonSummary:
    'Melromarc’s state faith elevates the Three Heroes while quieter cults remember older guardians. Wave after wave reshapes who is called holy.\n\nOst Hero and the Guardian Heroes still appear in oaths and festival plays.\n\nForgotten names cling to ruined churches the crown no longer funds.',
  deities: [
    makeDeity('The Three Heroes', { domains: ['heroism', 'order'] }),
    makeDeity('Ost Hero', { domains: ['salvation'] }),
    makeDeity('The Guardian Heroes', { domains: ['protection'] }),
    makeDeity('Wave Saint', { domains: ['calamity'] }),
    makeDeity('Filolial Matron', { domains: ['kinship'] }),
    makeDeity('Queen’s Chapel', { domains: ['crown'] }),
    makeDeity('Ashen Cardinal', { forgotten: true, domains: ['heresy'] }),
    makeDeity('Silent Shield', { forgotten: true, domains: ['exile'] })
  ]
}

/** Common live-model world shape: snake_case keys and double-newline paragraph breaks. */
export const REALISTIC_LLM_WORLD = {
  world_name: 'Eldermere',
  world_summary:
    'Winter steel closes on a desert caravan realm where salt and glass trade still matters. A missing envoy vanished into the uplands before the frost came, and caravan masters now argue over who owns the last water rights.\n\nPlateau clans still honor contracts written in ink on bone even when the rain calendars fail. Temple wardens hire mercenaries to guard oasis gates that used to need only a posted oath.\n\nThe Ashen Crown Kingdom and its rivals fight over the last caravan corridors before the frost seals every pass. Every side blames the other for the envoy’s disappearance.',
  world_history:
    'Eldermere was a shallow inland sea until the Sundering lifted the desert basins and stranded the old ports along cracked salt flats. Fisher towns became waystations overnight, and the first caravan routes were measured in days between dying wells. The oldest maps still show harbors where only dust devils walk now.\n\nCaravans first bridged the glass flats when oasis law was written in ink on bone, and those contracts still bind families who no longer remember the scribes. Disputes over water tithes started more feuds than any border war. Judges who break those contracts vanish on the roads they once patrolled.\n\nThe envoy houses were founded to carry trade oaths between plateau clans, but their last upland convoy never returned from the frost line. Search parties found only abandoned sledges and torn banners. The crown posted new envoys anyway, and none of them returned either.\n\nLast decade, winter storms arrived early and broke the old rain calendars that farmers and herders had trusted for generations. Granaries emptied faster than the temple granters could ration. Refugee camps now ring every walled oasis.\n\nNow the Ashen Crown Kingdom and its rivals fight over the last caravan corridors before the frost seals every pass. Beacon fires burn every night, but fewer caravans answer them. The missing envoy’s seal turned up last month in a trader’s junk chest, still warm to the touch.'
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
    'A failed harvest drove survivors into mountain kingdoms where bandits now wear the faces of the dead. Every pass town counts grain sacks twice before opening the gates.\n\nWinter closes every escape route while the living argue over the last granaries. Beacon fires burn, but fewer caravans answer them.\n\nThe world remembers older wars and older oaths that no one living can quite name. Survivors still trade rumors about which clan broke the compact first.',
  world_history:
    'The gods drowned the low roads in red ash when the old compact between mountain clans broke. Temple bells rang for days, but the ash still buried the valley floors. Refugees who escaped uphill rebuilt as cliff towns that still measure wealth in rope and grain.\n\nThe Reach corridor was once a trade route before the uplands rose and choked the low roads. Merchants still argue over which pass is safe after the first frost. Every contract names a different guide, but the same muddy switchbacks.\n\nBandits who steal faces appeared after the first frost corpses were pulled from the snow. Locals swear the masks are stolen from the dead themselves. Search parties stopped counting how many bodies wore a stranger’s face.\n\nEnvoys from the low cities stopped coming when the pass avalanches began. The crown posted new riders anyway, and none of them returned. Beacon crews now relight towers one at a time, always too late for someone.\n\nSurvivors still light beacon fires that no longer summon help, and every kingdom blames the others for the hunger winter. Granaries emptied faster than temple granters could ration. The pass may seal for good before anyone names the bandit king.'
}

export function buildCrimsonReachCascadingResponses(input: {
  regionCount: number
  npcsPerRegion: number
}): string[] {
  const regions = [
    makeRegion('Kingdom of Granary Pass', 'frost'),
    makeRegion('Deadface Marches', 'bandit')
  ].slice(0, input.regionCount)
  const responses: string[] = [
    EMPTY_CANON_RESPONSE,
    VALID_PANTHEON_RESPONSE,
    worldLabeledBlocks({
      worldName: CRIMSON_REACH_LLM_WORLD.world_name,
      worldSummary: CRIMSON_REACH_LLM_WORLD.world_summary,
      worldHistory: CRIMSON_REACH_LLM_WORLD.world_history
    }),
    VALID_FACTIONS_RESPONSE
  ]
  responses.push(regionsLabeledBlocks(regions))
  let npcIndex = 0
  for (const region of regions) {
    for (let slot = 0; slot < input.npcsPerRegion; slot += 1) {
      const base = makeRealisticLlmNpc(region.name, npcIndex)
      responses.push(
        singleNpcLabeledBlocks(region.name, {
          ...base,
          temperament: 'friendly',
          race: 'Human',
          alignment: base.alignment,
          backstory: base.backstory,
          disposition: base.disposition,
          role: base.role,
          name: base.name
        })
      )
      npcIndex += 1
    }
  }
  responses.push(makeBestiarySeedResponse())
  responses.push(
    storyLabeledBlocks({
      title: 'Faces in the Snow',
      summary: 'Learn who leads the dead-faced bandits before the pass seals for winter.'
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
  const responses: string[] = [
    EMPTY_CANON_RESPONSE,
    VALID_PANTHEON_RESPONSE,
    worldLabeledBlocks({
      worldName: REALISTIC_LLM_WORLD.world_name,
      worldSummary: REALISTIC_LLM_WORLD.world_summary,
      worldHistory: REALISTIC_LLM_WORLD.world_history
    }),
    REALISTIC_FACTIONS_RESPONSE
  ]
  responses.push(regionsLabeledBlocks(regions))
  let npcIndex = 0
  for (const region of regions) {
    for (let slot = 0; slot < input.npcsPerRegion; slot += 1) {
      responses.push(singleNpcLabeledBlocks(region.name, makeRealisticLlmNpc(region.name, npcIndex)))
      npcIndex += 1
    }
  }
  responses.push(makeBestiarySeedResponse())
  responses.push(
    storyLabeledBlocks({
      title: 'The Missing Envoy',
      summary: 'Find who stopped the upland envoy before winter closes every pass.'
    })
  )
  return responses
}

function defaultCascadingRegions(regionCount: number): ReturnType<typeof makeRegion>[] {
  if (regionCount === 0) {
    return []
  }
  if (regionCount === 1) {
    return [makeRegion('Oakhollow', 'old')]
  }
  return [makeRegion('Oakhollow', 'old'), makeRegion('The Sunken Crown', 'ruin')]
}

function pushNpcSlotResponses(
  responses: string[],
  regions: ReturnType<typeof makeRegion>[],
  npcsPerRegion: number
): void {
  for (const region of regions) {
    const npcTemplates = makeNpcs(region.name, region.name.slice(0, 4))
    for (let index = 0; index < npcsPerRegion; index += 1) {
      responses.push(makeSingleNpcPayload(region.name, npcTemplates[index]!))
    }
  }
}

export function buildCascadingSeedResponses(input: {
  regionCount: number
  npcsPerRegion: number
  regions?: ReturnType<typeof makeRegion>[]
  storyThread?: { title: string; state: string; summary: string }
  bestiaryFoes?: GeneratedBestiaryFoe[]
  canon?: {
    recognizedSetting: boolean
    settingLabel: string
    knownPlaces: string[]
    knownCharacters: string[]
    knownDeities?: string[]
  }
  pantheon?: typeof VALID_PANTHEON
}): string[] {
  const regions = input.regions ?? defaultCascadingRegions(input.regionCount)
  const storyThread =
    input.storyThread ??
    ({ title: 'The Crown Beneath the Waves', state: 'starting', summary: 'A throne lies hidden.' } as const)
  const canonPayload = input.canon ?? {
    recognizedSetting: false,
    settingLabel: '',
    knownPlaces: [] as string[],
    knownCharacters: [] as string[],
    knownDeities: [] as string[]
  }
  const pantheonPayload = input.pantheon ?? VALID_PANTHEON
  const responses: string[] = [
    canonLabeledBlocks(canonPayload),
    pantheonLabeledBlocks({
      pantheonSummary: pantheonPayload.pantheonSummary,
      deities: [...pantheonPayload.deities, ...PANTHEON_SKELETON_FILLER].slice(0, 10)
    }),
    worldLabeledBlocks(VALID_WORLD),
    VALID_FACTIONS_RESPONSE
  ]
  responses.push(regionsLabeledBlocks(regions))
  pushNpcSlotResponses(responses, regions, input.npcsPerRegion)
  responses.push(makeBestiarySeedResponse(input.bestiaryFoes))
  responses.push(storyLabeledBlocks({ title: storyThread.title, summary: storyThread.summary }))
  return responses
}

/** Fandom-shaped seed: Shield Hero canon → Melromarc / Raphtalia in scripted output. */
export function buildShieldHeroCascadingSeedResponses(input: {
  regionCount: number
  npcsPerRegion: number
}): string[] {
  const regions = [
    makeRegion('Melromarc', 'kingdom'),
    makeRegion('Siltvelt', 'beast')
  ].slice(0, input.regionCount)
  const characterNames = ['Raphtalia', 'Naofumi Iwatani', 'Filo', 'Motoyasu Kitamura', 'Itsuki Kawasumi', 'Ren Amaki']
  const responses: string[] = [
    canonLabeledBlocks(SHIELD_HERO_CANON),
    pantheonLabeledBlocks({
      pantheonSummary: SHIELD_HERO_PANTHEON.pantheonSummary,
      deities: [...SHIELD_HERO_PANTHEON.deities, ...PANTHEON_SKELETON_FILLER].slice(0, 10)
    }),
    worldLabeledBlocks(VALID_WORLD),
    VALID_FACTIONS_RESPONSE
  ]
  responses.push(regionsLabeledBlocks(regions))
  let npcIndex = 0
  for (const region of regions) {
    for (let slot = 0; slot < input.npcsPerRegion; slot += 1) {
      const name = characterNames[npcIndex] ?? `Local ${npcIndex}`
      const template = makeNpcs(region.name, 'Shld')[0]!
      responses.push(
        makeSingleNpcPayload(region.name, {
          ...template,
          name,
          regionName: region.name,
          backstory: `${name} lives and works in ${region.name}.`
        })
      )
      npcIndex += 1
    }
  }
  responses.push(makeBestiarySeedResponse(SHIELD_HERO_BESTIARY_FOES))
  responses.push(
    storyLabeledBlocks({
      title: 'Waves of Calamity',
      summary:
        'Survive the next wave while Melromarc’s politics sharpen around the Shield Hero.'
    })
  )
  return responses
}

export const VALID_GENERATION = JSON.stringify({
  regions: [makeRegion('Oakhollow', 'old'), makeRegion('The Sunken Crown', 'ruin')],
  npcs: [...makeNpcs('Oakhollow', 'Oak'), ...makeNpcs('The Sunken Crown', 'Crown')],
  storyThread: { title: 'The Crown Beneath the Waves', state: 'starting', summary: 'A throne lies hidden.' }
})

export function additionalRegionLabeledBlocks(
  region: {
    name: string
    description: string
    historyBackstory: string
    recentHistory: string
    potentialQuests: string[]
  },
  npcs: LabeledNpcFields[]
): string {
  const values: Record<string, string> = {
    REGION_NAME: region.name,
    REGION_DESCRIPTION: region.description,
    REGION_HISTORY_BACKSTORY: region.historyBackstory,
    REGION_RECENT_HISTORY: region.recentHistory,
    REGION_QUEST_0: region.potentialQuests[0] ?? `Quest A in ${region.name}`,
    REGION_QUEST_1: region.potentialQuests[1] ?? `Quest B in ${region.name}`
  }
  npcs.forEach((npc, index) => {
    const fields = resolveLabeledNpcFields(
      npc,
      `${npc.name} lives and works in ${region.name}.`
    )
    values[`NPC_${index}_NAME`] = fields.name
    values[`NPC_${index}_ROLE`] = fields.role
    values[`NPC_${index}_BACKSTORY`] = fields.backstory
    values[`NPC_${index}_DISPOSITION`] = fields.disposition
    values[`NPC_${index}_TEMPERAMENT`] = fields.temperament
    values[`NPC_${index}_ALIGNMENT`] = fields.alignment
    values[`NPC_${index}_RACE`] = fields.race
    values[`NPC_${index}_BACKGROUND`] = fields.background
    values[`NPC_${index}_GENDER`] = fields.gender
    values[`NPC_${index}_CLASS`] = fields.class
  })
  return formatLabeledBlocks(values)
}

export const ADDITIONAL_REGION = additionalRegionLabeledBlocks(
  makeRegion('Mistfen Crossing', 'marsh'),
  makeNpcs('Mistfen Crossing', 'Mist')
)

export const ADDITIONAL_REGION_PARSED = {
  region: makeRegion('Mistfen Crossing', 'marsh'),
  npcs: makeNpcs('Mistfen Crossing', 'Mist')
}

export const SETUP_INPUT = { name: 'Test Campaign', premisePrompt: 'A flooded kingdom.', deathMode: 'legendary' } as const

/**
 * Live local (Qwen 7B) world dump: model emitted two JSON objects instead of one.
 * From 020.31 schema-failure logs — attempt 2 (Aetheris).
 */
export const LIVE_SPLIT_WORLD_JSON_DUMP = [
  '{"worldName":"Aetheris","worldSummary":"Aetheris is an archipelago where ancient storms and forgotten knowledge shape the fate of its people. The sky is always a canvas of swirling clouds, and the sea whispers secrets between waves. Villages and towns cling to the rugged coasts, their wooden homes weathered by tempests and salt. Each dawn brings a new alignment of stars, guiding the faithful through the night.\\n\\nThe ruins of the old quarries and the crumbling monastery at the heart of the archipelago are shrouded in mystery. Strange lights flicker at dusk, and the whispers of Nyx and Thorn echo through the forgotten halls. People live in fear, but also in hope, that the answers to their prayers lie hidden within the shadows of the past.\\n\\nTensions define Aetheris today: guilds vie for control over trade routes and charting rights, while temples argue over the balance of power between the living and the forgotten. The storms bring both destruction and opportunity, and the people of Aetheris learn to navigate the ever-changing landscape of faith and fury."}',
  '',
  '{"worldHistory":"Three ages ago, the land of Aetheris was united under a single banner, ruled by the mighty Gornath and the revered Nyx. The storms brought bountiful harvests, and the sea offered endless riches. However, a great storm in the heart of the archipelago marked the beginning of the end. Temples of Gornath and Nyx clashed, each claiming the favor of the storm gods and the wisdom of the ancient knowledge keepers.\\n\\nIn the ensuing centuries, Aetheris fragmented into smaller kingdoms and independent towns. The Charting Guilds were formed to map the treacherous waters, but their power soon became contested by the Storm Priests, who claimed to control the fury of the seas. The old quarries and the ruined monastery became symbols of the forgotten gods, Nyx and Thorn, whose power had been banished.\\n\\nFor two centuries, the Charting Guilds and Storm Priests vied for dominance, until a great plague swept through the archipelago. The survivors, desperate for answers, turned to the ancient ruins and the whispers of the forgotten gods. In the last generation, explorer crews have returned with tales of living reefs and cursed ore, reigniting the age-old conflicts between the living and the forgotten.\\n\\nToday, Aetheris is a place where every captain and temple leader wonders if the next storm will bring a new age of unity or another cycle of strife. The old quarries and the ruined monastery continue to draw the curious and the brave, promising both danger and enlightenment. The fate of Aetheris lies in the balance, held aloft by the storm clouds and the whispers of the forgotten."}'
].join('\n')

/** Live local factions dump (020.33): medium pressure, no kind=religious despite pantheon. */
export const LIVE_MEDIUM_FACTIONS_MISSING_RELIGIOUS_KIND = {
  factionPressure: 'medium',
  factionsSummary:
    'The Stormbringers seek to control the skies, while the Weavers weave the threads of trade. Both face the Aldorin and Drakath guardianship and the threat of the upright wolves in the passes.',
  factions: [
    {
      key: 'stormbringers',
      name: 'Stormbringers Guild',
      kind: 'civic',
      summary: 'Mages who harness the storms for power and protection.',
      motivation: 'To control the skies and protect Faelornis from storms.',
      publicFace: 'Benefactors of the storms, providers of safety and magic.',
      methods: 'Spellcasting, weather manipulation, alliances with storm gods.',
      sortOrder: 0
    },
    {
      key: 'weavers',
      name: 'Weavers Guild',
      kind: 'mercantile',
      summary: 'Crafters who spin the threads of trade and commerce.',
      motivation: 'To establish and maintain the flow of goods and ideas across the land.',
      publicFace: 'Artisans of trade, guardians of the marketplaces.',
      methods: 'Trade negotiation, market control, guild diplomacy.',
      sortOrder: 1
    },
    {
      key: 'aldrin_drakath',
      name: 'Guardians of the Passes',
      kind: 'military',
      summary: 'Ancient beings who protect the mountain passes and the secrets within.',
      motivation: 'To safeguard the land from threats both known and unknown.',
      publicFace: 'The guardians of the ancient ways, keepers of the mountain paths.',
      methods: 'Patrols, fortifications, ritualistic defense.',
      sortOrder: 2
    },
    {
      key: 'upright_wolves',
      name: 'Upright Wolves',
      kind: 'clandestine',
      summary: 'Wolves that walk upright and move through the passes, their purpose unclear.',
      motivation: 'Unknown, may be seeking passage, resources, or something else.',
      publicFace: 'Whispered legends of strange beasts.',
      methods: 'Stealth, mystery, movement through the passes.',
      sortOrder: 3
    }
  ],
  relations: [
    {
      factionAKey: 'stormbringers',
      factionBKey: 'weavers',
      stance: 'tense',
      summary: 'Competition for resources and influence over the people.'
    },
    {
      factionAKey: 'stormbringers',
      factionBKey: 'aldrin_drakath',
      stance: 'rival',
      summary: 'Conflicts over the control of the skies and the mountains.'
    },
    {
      factionAKey: 'weavers',
      factionBKey: 'aldrin_drakath',
      stance: 'rival',
      summary: 'Disputes over the safe passage of trade and goods.'
    }
  ]
}

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

/** Scripted speaking-style post-pass (092) for persist / generateSingleNpc tests. */
export const NPC_SPEAKING_STYLE_RESPONSE = JSON.stringify({
  specimen: "I keep my voice low and my bargains lower — that's how you survive here.",
  examples: ['Coin first, questions later.', 'You want trouble? Try the next stall.']
})

export function npcSpeakingStyleResponses(count: number): string[] {
  return Array.from({ length: count }, () => NPC_SPEAKING_STYLE_RESPONSE)
}

/** Scripted species appearance-only follow-up after preset-lore bestiary persist (123.2). */
export const SPECIES_APPEARANCE_RESPONSE = JSON.stringify({
  visualAppearance: {
    silhouette: 'quadruped wolf-like',
    sizeClass: 'medium',
    primaryColors: ['ash grey'],
    distinguishingMarks: 'scarred flank',
    textureOrMaterial: 'matted fur'
  }
})

export function speciesAppearanceResponses(count: number): string[] {
  return Array.from({ length: count }, () => SPECIES_APPEARANCE_RESPONSE)
}

/**
 * Persist-time enrichment queue after campaign seed generation:
 * unique race lore realizes, then per speaking NPC: speaking-style + combat review,
 * then optional appearance-only calls for preset-lore bestiary foes (123.2).
 */
export function persistNpcEnrichmentResponses(
  npcCount: number,
  uniqueRaceCount = 1,
  bestiaryFoeCount = DEFAULT_BESTIARY_FOES.length
): string[] {
  return [
    ...Array.from({ length: uniqueRaceCount }, () => RACE_LORE_RESPONSE),
    ...Array.from({ length: npcCount }, () => [
      NPC_SPEAKING_STYLE_RESPONSE,
      '{"upgrade":false}'
    ]).flat(),
    ...speciesAppearanceResponses(bestiaryFoeCount)
  ]
}
