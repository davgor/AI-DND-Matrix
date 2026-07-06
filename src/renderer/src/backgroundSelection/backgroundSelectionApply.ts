import type { BackgroundApplyInput } from '../../../shared/characterBackground/types'
import type { BackgroundSelectionState } from './backgroundSelectionLogic'

export function buildBackgroundApplyInput(
  campaignId: string,
  characterId: string,
  state: BackgroundSelectionState
): BackgroundApplyInput | null {
  if (!state.backgroundKey) {
    return null
  }
  return {
    campaignId,
    characterId,
    backgroundKey: state.backgroundKey,
    backgroundStory: state.story
  }
}
