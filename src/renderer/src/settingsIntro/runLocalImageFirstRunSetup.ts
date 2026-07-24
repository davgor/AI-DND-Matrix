import type { RedactedProviderSettings, SaveProviderSettingsInput } from '../../../shared/settings/types'
import { buildSaveInput, toDraftSettings } from '../settings/settingsDraft'

interface DeclineLocalImagePromptDeps {
  getSettings: () => Promise<RedactedProviderSettings>
  saveSettings: (input: SaveProviderSettingsInput) => Promise<RedactedProviderSettings>
}

/** Persist decline so the post-LLM image prompt is not re-shown (epic 152.13). */
export async function declineLocalImagePrompt(deps: DeclineLocalImagePromptDeps): Promise<void> {
  const draft = toDraftSettings(await deps.getSettings())
  draft.imageGeneration = {
    ...draft.imageGeneration,
    enabled: false,
    postLocalLlmPromptDeclined: true
  }
  await deps.saveSettings(buildSaveInput(draft))
}
