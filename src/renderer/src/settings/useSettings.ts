import { useEffect, useState } from 'react'
import type {
  ConnectionCheckResult,
  ProviderSettings,
  ProviderValidationContext,
  SettingsValidationError
} from '../../../shared/settings/types'
import { DEFAULT_PROVIDER_SETTINGS } from '../../../shared/settings/types'
import { validateProviderSettings } from '../../../shared/settings/validation'
import { buildSaveInput, isSettingsDirty, toDraftSettings } from './settingsDraft'
import { createLlamaSettingsActions } from './useSettingsLlamaActions'

export interface SettingsController {
  draft: ProviderSettings
  claudeApiKeySet: boolean
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
  grokApiKeySet: boolean
  dirty: boolean
  draftValid: boolean
  errors: SettingsValidationError[]
  saving: boolean
  saveFailed: boolean
  confirmingDiscard: boolean
  playerConnectionResult: ConnectionCheckResult | null
  cloudConnectionResult: ConnectionCheckResult | null
  llamaRuntimeResult: ConnectionCheckResult | null
  llamaRuntimeChecked: boolean
  updateDraft: (patch: Partial<ProviderSettings>) => void
  save: () => Promise<void>
  requestClose: () => void
  confirmDiscard: () => void
  cancelDiscard: () => void
  testPlayer2: () => Promise<void>
  testCloud: () => Promise<void>
  checkLlamaRuntime: () => Promise<void>
  downloadLlamaModel: () => Promise<void>
  cancelLlamaDownload: () => Promise<void>
  acquireLlamaRuntime: () => Promise<void>
}

interface ApiKeySetFlags {
  claudeApiKeySet: boolean
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
  grokApiKeySet: boolean
}

interface SettingsState extends ApiKeySetFlags {
  baseline: ProviderSettings
  draft: ProviderSettings
  errors: SettingsValidationError[]
  saving: boolean
  saveFailed: boolean
  confirmingDiscard: boolean
  playerConnectionResult: ConnectionCheckResult | null
  cloudConnectionResult: ConnectionCheckResult | null
  llamaRuntimeResult: ConnectionCheckResult | null
  llamaRuntimeChecked: boolean
  setBaseline: (settings: ProviderSettings) => void
  setDraft: React.Dispatch<React.SetStateAction<ProviderSettings>>
  setApiKeyFlags: (flags: ApiKeySetFlags) => void
  setErrors: (errors: SettingsValidationError[]) => void
  setSaving: (value: boolean) => void
  setSaveFailed: (value: boolean) => void
  setConfirmingDiscard: (value: boolean) => void
  setPlayerConnectionResult: (result: ConnectionCheckResult | null) => void
  setCloudConnectionResult: (result: ConnectionCheckResult | null) => void
  setLlamaRuntimeResult: (result: ConnectionCheckResult | null) => void
  setLlamaRuntimeChecked: (value: boolean) => void
}

function emptyKeyFlags(): ApiKeySetFlags {
  return {
    claudeApiKeySet: false,
    openaiApiKeySet: false,
    geminiApiKeySet: false,
    grokApiKeySet: false
  }
}

function validationContext(flags: ApiKeySetFlags): ProviderValidationContext {
  return flags
}

function cloudCredentials(
  draft: ProviderSettings
): { mode: 'claude' | 'openai' | 'gemini' | 'grok'; apiKey: string; model: string } | null {
  if (draft.mode === 'claude') {
    return { mode: 'claude', apiKey: draft.claudeApiKey, model: draft.claudeModel }
  }
  if (draft.mode === 'openai') {
    return { mode: 'openai', apiKey: draft.openaiApiKey, model: draft.openaiModel }
  }
  if (draft.mode === 'gemini') {
    return { mode: 'gemini', apiKey: draft.geminiApiKey, model: draft.geminiModel }
  }
  if (draft.mode === 'grok') {
    return { mode: 'grok', apiKey: draft.grokApiKey, model: draft.grokModel }
  }
  return null
}

function useSettingsState(): SettingsState {
  const [baseline, setBaseline] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS)
  const [draft, setDraft] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS)
  const [apiKeyFlags, setApiKeyFlags] = useState<ApiKeySetFlags>(emptyKeyFlags)
  const [errors, setErrors] = useState<SettingsValidationError[]>([])
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [playerConnectionResult, setPlayerConnectionResult] = useState<ConnectionCheckResult | null>(null)
  const [cloudConnectionResult, setCloudConnectionResult] = useState<ConnectionCheckResult | null>(null)
  const [llamaRuntimeResult, setLlamaRuntimeResult] = useState<ConnectionCheckResult | null>(null)
  const [llamaRuntimeChecked, setLlamaRuntimeChecked] = useState(false)

  return {
    baseline,
    draft,
    ...apiKeyFlags,
    errors,
    saving,
    saveFailed,
    confirmingDiscard,
    playerConnectionResult,
    cloudConnectionResult,
    llamaRuntimeResult,
    llamaRuntimeChecked,
    setBaseline,
    setDraft,
    setApiKeyFlags,
    setErrors,
    setSaving,
    setSaveFailed,
    setConfirmingDiscard,
    setPlayerConnectionResult,
    setCloudConnectionResult,
    setLlamaRuntimeResult,
    setLlamaRuntimeChecked
  }
}

function useLoadSettingsOnMount(state: SettingsState): void {
  useEffect(() => {
    async function load(): Promise<void> {
      const redacted = await window.settings.get()
      const nextDraft = toDraftSettings(redacted)
      state.setBaseline(nextDraft)
      state.setDraft(nextDraft)
      state.setApiKeyFlags({
        claudeApiKeySet: redacted.claudeApiKeySet,
        openaiApiKeySet: redacted.openaiApiKeySet,
        geminiApiKeySet: redacted.geminiApiKeySet,
        grokApiKeySet: redacted.grokApiKeySet
      })
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function currentKeyFlags(state: SettingsState): ApiKeySetFlags {
  return {
    claudeApiKeySet: state.claudeApiKeySet,
    openaiApiKeySet: state.openaiApiKeySet,
    geminiApiKeySet: state.geminiApiKeySet,
    grokApiKeySet: state.grokApiKeySet
  }
}

async function performSave(state: SettingsState): Promise<void> {
  const flags = currentKeyFlags(state)
  const validationErrors = validateProviderSettings(state.draft, validationContext(flags))
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
    state.setApiKeyFlags({
      claudeApiKeySet: redacted.claudeApiKeySet,
      openaiApiKeySet: redacted.openaiApiKeySet,
      geminiApiKeySet: redacted.geminiApiKeySet,
      grokApiKeySet: redacted.grokApiKeySet
    })
    if (nextDraft.mode === 'llamacpp') {
      const applyResult = await window.settings.applyLlamaLifecycle()
      state.setLlamaRuntimeResult(applyResult)
      state.setLlamaRuntimeChecked(applyResult.ok)
    }
  } catch {
    state.setSaveFailed(true)
  } finally {
    state.setSaving(false)
  }
}

function createConnectionActions(state: SettingsState): {
  testPlayer2: () => Promise<void>
  testCloud: () => Promise<void>
  checkLlamaRuntime: () => Promise<void>
} {
  return {
    async testPlayer2(): Promise<void> {
      state.setPlayerConnectionResult(
        await window.settings.testPlayer2Connection(state.draft.player2BaseUrl)
      )
    },
    async testCloud(): Promise<void> {
      const credentials = cloudCredentials(state.draft)
      if (!credentials) {
        return
      }
      state.setCloudConnectionResult(await window.settings.testCloudConnection(credentials))
    },
    async checkLlamaRuntime(): Promise<void> {
      const result = await window.settings.checkLlamaRuntime(state.draft)
      state.setLlamaRuntimeResult(result)
      state.setLlamaRuntimeChecked(result.ok)
    }
  }
}

function useSettingsActions(state: SettingsState, onClose: () => void) {
  function updateDraft(patch: Partial<ProviderSettings>): void {
    state.setDraft((current) => ({ ...current, ...patch }))
    state.setErrors([])
    state.setSaveFailed(false)
    state.setLlamaRuntimeChecked(false)
    state.setCloudConnectionResult(null)
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

  return {
    updateDraft,
    save: () => performSave(state),
    requestClose,
    confirmDiscard,
    cancelDiscard: () => state.setConfirmingDiscard(false),
    ...createConnectionActions(state),
    ...createLlamaSettingsActions(state)
  }
}

export function useSettings(onClose: () => void): SettingsController {
  const state = useSettingsState()
  useLoadSettingsOnMount(state)
  const actions = useSettingsActions(state, onClose)
  const flags = currentKeyFlags(state)
  const draftValid = validateProviderSettings(state.draft, validationContext(flags)).length === 0

  return {
    draft: state.draft,
    claudeApiKeySet: state.claudeApiKeySet,
    openaiApiKeySet: state.openaiApiKeySet,
    geminiApiKeySet: state.geminiApiKeySet,
    grokApiKeySet: state.grokApiKeySet,
    dirty: isSettingsDirty(state.baseline, state.draft),
    draftValid,
    errors: state.errors,
    saving: state.saving,
    saveFailed: state.saveFailed,
    confirmingDiscard: state.confirmingDiscard,
    playerConnectionResult: state.playerConnectionResult,
    cloudConnectionResult: state.cloudConnectionResult,
    llamaRuntimeResult: state.llamaRuntimeResult,
    llamaRuntimeChecked: state.llamaRuntimeChecked,
    ...actions
  }
}
