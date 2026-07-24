import { REFERENCE_LLAMACPP_CATALOG_ID } from '../../../shared/settings/llamaCppCatalog'
import type {
  ProviderSettings,
  RedactedProviderSettings,
  SaveProviderSettingsInput
} from '../../../shared/settings/types'
import { buildSaveInput, toDraftSettings } from '../settings/settingsDraft'

type LocalLlmFirstRunBackend = ProviderSettings['llamaCppRuntimeBackend']

interface LocalLlmFirstRunSetupDeps {
  backend: LocalLlmFirstRunBackend
  getSettings: () => Promise<RedactedProviderSettings>
  saveSettings: (input: SaveProviderSettingsInput) => Promise<RedactedProviderSettings>
  acquireRuntime: () => Promise<
    { ok: true; serverPath: string } | { ok: false; message: string; recoveryHint: string }
  >
  downloadModel: (
    catalogModelId: string
  ) => Promise<{ ok: true; modelPath: string } | { ok: false; message: string }>
  applyLifecycle: () => Promise<{ ok: boolean; message: string }>
}

type LocalLlmFirstRunSetupResult = { ok: true } | { ok: false; message: string }

/** Persist backend, acquire runtime, download reference model, switch to managed llamacpp. */
export async function runLocalLlmFirstRunSetup(
  deps: LocalLlmFirstRunSetupDeps
): Promise<LocalLlmFirstRunSetupResult> {
  const draft = toDraftSettings(await deps.getSettings())
  draft.llamaCppRuntimeBackend = deps.backend
  draft.llamaCppCatalogModelId = REFERENCE_LLAMACPP_CATALOG_ID
  await deps.saveSettings(buildSaveInput(draft))

  const acquired = await deps.acquireRuntime()
  if (!acquired.ok) {
    return { ok: false, message: `${acquired.message} ${acquired.recoveryHint}`.trim() }
  }

  const downloaded = await deps.downloadModel(REFERENCE_LLAMACPP_CATALOG_ID)
  if (!downloaded.ok) {
    return { ok: false, message: downloaded.message }
  }

  const next = toDraftSettings(await deps.getSettings())
  next.mode = 'llamacpp'
  next.llamaCppStartMode = 'managed'
  next.llamaCppRuntimeBackend = deps.backend
  next.llamaCppCatalogModelId = REFERENCE_LLAMACPP_CATALOG_ID
  next.llamaCppDownloadState = 'ready'
  next.llamaCppServerPath = acquired.serverPath
  next.llamaCppModelPath = downloaded.modelPath
  await deps.saveSettings(buildSaveInput(next))

  const applied = await deps.applyLifecycle()
  if (!applied.ok) {
    return { ok: false, message: applied.message }
  }
  return { ok: true }
}

export type { LocalLlmFirstRunBackend }
