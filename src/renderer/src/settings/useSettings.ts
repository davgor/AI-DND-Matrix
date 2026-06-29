import { useEffect, useState } from 'react'
import type {
  ConnectionCheckResult,
  ProviderSettings,
  SettingsValidationError
} from '../../../shared/settings/types'
import { DEFAULT_PROVIDER_SETTINGS } from '../../../shared/settings/types'
import { validateProviderSettings } from '../../../shared/settings/validation'
import { buildSaveInput, isSettingsDirty, toDraftSettings } from './settingsDraft'

export interface SettingsController {
  draft: ProviderSettings
  claudeApiKeySet: boolean
  dirty: boolean
  errors: SettingsValidationError[]
  saving: boolean
  saveFailed: boolean
  confirmingDiscard: boolean
  playerConnectionResult: ConnectionCheckResult | null
  llamaRuntimeResult: ConnectionCheckResult | null
  updateDraft: (patch: Partial<ProviderSettings>) => void
  save: () => Promise<void>
  requestClose: () => void
  confirmDiscard: () => void
  cancelDiscard: () => void
  testPlayer2: () => Promise<void>
  checkLlamaRuntime: () => Promise<void>
}

interface SettingsState {
  baseline: ProviderSettings
  draft: ProviderSettings
  claudeApiKeySet: boolean
  errors: SettingsValidationError[]
  saving: boolean
  saveFailed: boolean
  confirmingDiscard: boolean
  playerConnectionResult: ConnectionCheckResult | null
  llamaRuntimeResult: ConnectionCheckResult | null
  setBaseline: (settings: ProviderSettings) => void
  setDraft: React.Dispatch<React.SetStateAction<ProviderSettings>>
  setClaudeApiKeySet: (value: boolean) => void
  setErrors: (errors: SettingsValidationError[]) => void
  setSaving: (value: boolean) => void
  setSaveFailed: (value: boolean) => void
  setConfirmingDiscard: (value: boolean) => void
  setPlayerConnectionResult: (result: ConnectionCheckResult | null) => void
  setLlamaRuntimeResult: (result: ConnectionCheckResult | null) => void
}

function useSettingsState(): SettingsState {
  const [baseline, setBaseline] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS)
  const [draft, setDraft] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS)
  const [claudeApiKeySet, setClaudeApiKeySet] = useState(false)
  const [errors, setErrors] = useState<SettingsValidationError[]>([])
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [playerConnectionResult, setPlayerConnectionResult] = useState<ConnectionCheckResult | null>(null)
  const [llamaRuntimeResult, setLlamaRuntimeResult] = useState<ConnectionCheckResult | null>(null)

  return {
    baseline,
    draft,
    claudeApiKeySet,
    errors,
    saving,
    saveFailed,
    confirmingDiscard,
    playerConnectionResult,
    llamaRuntimeResult,
    setBaseline,
    setDraft,
    setClaudeApiKeySet,
    setErrors,
    setSaving,
    setSaveFailed,
    setConfirmingDiscard,
    setPlayerConnectionResult,
    setLlamaRuntimeResult
  }
}

function useLoadSettingsOnMount(state: SettingsState): void {
  useEffect(() => {
    async function load(): Promise<void> {
      const redacted = await window.settings.get()
      const nextDraft = toDraftSettings(redacted)
      state.setBaseline(nextDraft)
      state.setDraft(nextDraft)
      state.setClaudeApiKeySet(redacted.claudeApiKeySet)
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

async function performSave(state: SettingsState): Promise<void> {
  const validationErrors = validateProviderSettings(state.draft)
  if (validationErrors.length > 0) {
    state.setErrors(validationErrors)
    return
  }
  state.setSaving(true)
  state.setSaveFailed(false)
  try {
    const redacted = await window.settings.save(buildSaveInput(state.draft))
    const nextDraft = toDraftSettings(redacted)
    state.setBaseline(nextDraft)
    state.setDraft(nextDraft)
    state.setClaudeApiKeySet(redacted.claudeApiKeySet)
  } catch {
    state.setSaveFailed(true)
  } finally {
    state.setSaving(false)
  }
}

function useSettingsActions(state: SettingsState, onClose: () => void) {
  function updateDraft(patch: Partial<ProviderSettings>): void {
    state.setDraft((current) => ({ ...current, ...patch }))
    state.setErrors([])
    state.setSaveFailed(false)
  }

  function requestClose(): void {
    if (isSettingsDirty(state.baseline, state.draft)) {
      state.setConfirmingDiscard(true)
      return
    }
    onClose()
  }

  function confirmDiscard(): void {
    state.setDraft(state.baseline)
    state.setConfirmingDiscard(false)
    onClose()
  }

  async function testPlayer2(): Promise<void> {
    state.setPlayerConnectionResult(await window.settings.testPlayer2Connection(state.draft.player2BaseUrl))
  }

  async function checkLlamaRuntime(): Promise<void> {
    state.setLlamaRuntimeResult(await window.settings.checkLlamaRuntime(state.draft))
  }

  return {
    updateDraft,
    save: () => performSave(state),
    requestClose,
    confirmDiscard,
    cancelDiscard: () => state.setConfirmingDiscard(false),
    testPlayer2,
    checkLlamaRuntime
  }
}

export function useSettings(onClose: () => void): SettingsController {
  const state = useSettingsState()
  useLoadSettingsOnMount(state)
  const actions = useSettingsActions(state, onClose)

  return {
    draft: state.draft,
    claudeApiKeySet: state.claudeApiKeySet,
    dirty: isSettingsDirty(state.baseline, state.draft),
    errors: state.errors,
    saving: state.saving,
    saveFailed: state.saveFailed,
    confirmingDiscard: state.confirmingDiscard,
    playerConnectionResult: state.playerConnectionResult,
    llamaRuntimeResult: state.llamaRuntimeResult,
    ...actions
  }
}
