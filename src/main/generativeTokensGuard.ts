import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import {
  generativeTokensGuardMessage,
  isImageProviderReadyForGenerativeTokens
} from '../shared/settings/generativeTokensGate'
import { createElectronSecretCodec, getSettingsFilePath, loadSettings } from './settingsStore'

type GenerativeTokensGuardResult = { ok: true } | { ok: false; message: string }

function defaultAssert(enabled: boolean): GenerativeTokensGuardResult {
  if (!enabled) {
    return { ok: true }
  }
  try {
    const settings = loadSettings(
      getSettingsFilePath(),
      createElectronSecretCodec(),
      DEFAULT_PROVIDER_SETTINGS
    )
    if (isImageProviderReadyForGenerativeTokens(settings)) {
      return { ok: true }
    }
  } catch {
    /* fall through */
  }
  return { ok: false, message: generativeTokensGuardMessage() }
}

let guardImpl: (enabled: boolean) => GenerativeTokensGuardResult = defaultAssert

/** Test-only: force guard result (e.g. always allow) without writing Settings. */
export function setGenerativeTokensGuardForTests(
  impl: ((enabled: boolean) => GenerativeTokensGuardResult) | null
): void {
  guardImpl = impl ?? defaultAssert
}

export function assertGenerativeTokensAllowed(enabled: boolean): GenerativeTokensGuardResult {
  return guardImpl(enabled)
}
