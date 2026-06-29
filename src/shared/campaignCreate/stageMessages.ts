import type { CreateCampaignStage } from './types'

export function mapCreateStageToPlayerMessage(stage: CreateCampaignStage | null): string {
  switch (stage) {
    case 'request':
      return 'Consulting the narrative engine'
    case 'parse':
      return 'Shaping your world'
    case 'persist':
      return 'Saving your campaign'
    default:
      return 'Creating your campaign'
  }
}
