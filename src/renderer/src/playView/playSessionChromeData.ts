import type { CampaignDetail } from '../../../main/campaignIpc'
import type { Character } from '../../../db/repositories/characters'

export interface PlaySessionChromeData {
  characterName: string
  portraitPath: string | null
  regionName: string | null
  inGameDay: number
  campaignName: string | null
  mainQuestTitle: string | null
  loading: boolean
}

function resolveRegionName(detail: CampaignDetail, character: Character): string | null {
  const regionId = (character.stats as { currentRegionId?: string }).currentRegionId
  if (!regionId) {
    return null
  }
  return detail.regions.find((region) => region.id === regionId)?.name ?? null
}

function resolveRegionBlurb(detail: CampaignDetail, character: Character): string | null {
  const regionId = (character.stats as { currentRegionId?: string }).currentRegionId
  if (!regionId) {
    return null
  }
  return detail.regions.find((entry) => entry.id === regionId)?.description ?? null
}

function loadingChromeData(
  detail: CampaignDetail | null,
  character: Character | null
): PlaySessionChromeData & { regionBlurb: string | null } {
  const campaign = detail?.campaign
  return {
    loading: true,
    characterName: character === null ? '…' : character.name,
    portraitPath: character === null ? null : character.portraitPath,
    regionName: null,
    regionBlurb: null,
    inGameDay: campaign === undefined ? 0 : campaign.inGameDate,
    campaignName: campaign === undefined ? null : campaign.name,
    mainQuestTitle: null
  }
}

function loadedChromeData(
  detail: CampaignDetail,
  character: Character
): PlaySessionChromeData & { regionBlurb: string | null } {
  const campaign = detail.campaign
  return {
    loading: false,
    characterName: character.name,
    portraitPath: character.portraitPath,
    regionName: resolveRegionName(detail, character),
    regionBlurb: resolveRegionBlurb(detail, character),
    inGameDay: campaign === undefined ? 0 : campaign.inGameDate,
    campaignName: campaign === undefined ? null : campaign.name,
    mainQuestTitle: null
  }
}

export function buildChromeData(
  detail: CampaignDetail | null,
  character: Character | null
): PlaySessionChromeData & { regionBlurb: string | null } {
  if (detail === null || character === null) {
    return loadingChromeData(detail, character)
  }
  return loadedChromeData(detail, character)
}
