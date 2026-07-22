import type { ProviderSettings } from '../../../shared/settings/types'

/** Subset of settings state setters needed for llama download/acquire actions. */
interface LlamaSettingsActionState {
  draft: ProviderSettings
  setDraft: React.Dispatch<React.SetStateAction<ProviderSettings>>
  setLlamaRuntimeResult: (result: { ok: boolean; message: string } | null) => void
  setLlamaRuntimeChecked: (value: boolean) => void
}

export function createLlamaSettingsActions(state: LlamaSettingsActionState): {
  downloadLlamaModel: () => Promise<void>
  cancelLlamaDownload: () => Promise<void>
  acquireLlamaRuntime: () => Promise<void>
} {
  return {
    downloadLlamaModel: () => downloadLlamaModel(state),
    cancelLlamaDownload: () => window.settings.cancelLlamaModelDownload(),
    acquireLlamaRuntime: () => acquireLlamaRuntime(state)
  }
}

async function downloadLlamaModel(state: LlamaSettingsActionState): Promise<void> {
  const catalogId = state.draft.llamaCppCatalogModelId
  if (!catalogId) {
    return
  }
  state.setDraft((current) => ({ ...current, llamaCppDownloadState: 'downloading' }))
  const result = await window.settings.startLlamaModelDownload(catalogId)
  if (result.ok) {
    state.setDraft((current) => ({
      ...current,
      llamaCppDownloadState: 'ready',
      llamaCppModelPath: result.modelPath,
      llamaCppStartMode: 'managed'
    }))
    return
  }
  state.setDraft((current) => ({ ...current, llamaCppDownloadState: 'failed' }))
  state.setLlamaRuntimeResult({ ok: false, message: result.message })
}

async function acquireLlamaRuntime(state: LlamaSettingsActionState): Promise<void> {
  const result = await window.settings.acquireLlamaRuntime()
  if (result.ok) {
    state.setDraft((current) => ({
      ...current,
      llamaCppServerPath: result.serverPath,
      llamaCppStartMode: 'managed'
    }))
    state.setLlamaRuntimeResult({ ok: true, message: `Runtime acquired at ${result.serverPath}` })
    return
  }
  state.setLlamaRuntimeResult({
    ok: false,
    message: `${result.message} ${result.recoveryHint}`
  })
}
