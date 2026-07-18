import {
  CREATE_CAMPAIGN_STAGE_ORDER,
  CREATE_CAMPAIGN_STAGE_TOTAL,
  type CreateCampaignProgress,
  type CreateCampaignStage
} from './types'

export const CREATE_STAGE_GOOFY_MESSAGES: Record<CreateCampaignStage, readonly string[]> = {
  canon: [
    'Checking if this world already has a map…',
    'Asking the lore librarians for names…',
    'Rummaging the known-places drawer…',
    'Matching the premise to remembered kingdoms…',
    'Looking up famous locals (politely)…',
    'Consulting the setting concordance…'
  ],
  pantheon: [
    'Counting temple seats for quarrelsome gods…',
    'Negotiating with forgotten deities…',
    'Sorting major and minor miracles…',
    'Naming powers the maps forgot…',
    'Arguing about domains over tea…',
    'Dusting off lost cults…'
  ],
  world: [
    'Arguing with the geography committee…',
    'Teaching dragons which way is north…',
    'Sketching continents on a napkin…',
    'Rolling for divine favor…',
    'Convincing tectonic plates to cooperate…',
    'Asking the stars to pick a theme…'
  ],
  regions: [
    'Drawing borders nobody will respect…',
    'Naming a tavern in every hamlet…',
    'Deciding which hills are haunted…',
    'Inventing weather that hates travelers…',
    'Planting suspicious ruins…',
    'Allocating fog budgets per valley…'
  ],
  npcs: [
    'Auditioning tavern regulars…',
    'Rolling on the "quirky local" table…',
    'Convincing NPCs they definitely have a backstory…',
    'Spawning villagers with opinions…',
    'Handing out suspiciously specific rumors…',
    'Drafting the guy who knows a guy…'
  ],
  story: [
    'Planting a main quest like a landmine…',
    'Weaving foreshadowing nobody will notice…',
    'Negotiating with the plot hooks union…',
    'Choosing which prophecy sounds coolest…',
    'Tying loose narrative threads (wish us luck)…',
    'Letting the villain think they are the protagonist…'
  ],
  persist: [
    'Chiseling lore into the save file…',
    'Stuffing the world into SQLite…',
    'Filing paperwork with the Realm Registrar…',
    'Stapling regions to the campaign binder…',
    'Committing fiction to durable storage…',
    'Teaching the database what a swamp is…'
  ]
}

export function pickCreateStageGoofyMessage(stage: CreateCampaignStage): string {
  const options = CREATE_STAGE_GOOFY_MESSAGES[stage]
  return options[Math.floor(Math.random() * options.length)]!
}

export function buildCreateProgress(stage: CreateCampaignStage): CreateCampaignProgress {
  const stageIndex = CREATE_CAMPAIGN_STAGE_ORDER.indexOf(stage)
  return {
    stage,
    stageIndex,
    stageTotal: CREATE_CAMPAIGN_STAGE_TOTAL,
    statusText: pickCreateStageGoofyMessage(stage)
  }
}

export function mapCreateStageToPlayerMessage(stage: CreateCampaignStage | null): string {
  switch (stage) {
    case 'canon':
      return 'Recalling known places and people'
    case 'pantheon':
      return 'Assembling the pantheon'
    case 'world':
      return 'Imagining your world'
    case 'regions':
      return 'Shaping regions'
    case 'npcs':
      return 'Populating your world'
    case 'story':
      return 'Weaving the main story'
    case 'persist':
      return 'Saving your campaign'
    default:
      return 'Creating your campaign'
  }
}

export function mapCreateStageTraceLabel(stage: CreateCampaignStage): string {
  switch (stage) {
    case 'canon':
      return 'Canon'
    case 'pantheon':
      return 'Pantheon'
    case 'world':
      return 'World'
    case 'regions':
      return 'Regions'
    case 'npcs':
      return 'NPCs'
    case 'story':
      return 'Story'
    case 'persist':
      return 'Saving'
  }
}
