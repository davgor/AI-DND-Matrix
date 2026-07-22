import type { BackgroundApplyInput } from '../../../shared/characterBackground/types'
import {
  isCustomBackgroundKey,
  normalizeCustomBackgroundLabel
} from '../../../shared/characterBackground/types'
import type { BackgroundSelectionState } from './backgroundSelectionLogic'
import { canConfirmBackgroundSelection } from './backgroundSelectionLogic'

export function buildBackgroundApplyInput(
  campaignId: string,
  characterId: string,
  state: BackgroundSelectionState
): BackgroundApplyInput | null {
  if (!state.backgroundKey || !canConfirmBackgroundSelection(state)) {
    return null
  }
  const input: BackgroundApplyInput = {
    campaignId,
    characterId,
    backgroundKey: state.backgroundKey,
    backgroundStory: state.story
  }
  if (isCustomBackgroundKey(state.backgroundKey)) {
    input.backgroundCustomLabel = normalizeCustomBackgroundLabel(state.customLabel)
  } else {
    input.backgroundCustomLabel = null
  }
  return input
}
