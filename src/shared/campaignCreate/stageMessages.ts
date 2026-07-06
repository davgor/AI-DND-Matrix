import type { CreateCampaignStage } from './types'

export function mapCreateStageToPlayerMessage(stage: CreateCampaignStage | null): string {
  switch (stage) {
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
