import { useCallback } from 'react'
import { nextSettingsIntroStepAfterLocalLlmSuccess } from '../../../shared/settingsIntro/wizardSteps'
import type { SettingsIntroWizardStep } from '../../../shared/settingsIntro/types'
import {
  runLocalLlmFirstRunSetup,
  type LocalLlmFirstRunBackend
} from './runLocalLlmFirstRunSetup'

interface LocalLlmIntroSetupCallbacks {
  setStep: (step: SettingsIntroWizardStep) => void
  setSetupError: (message: string | null) => void
  setText: (value: string | null) => void
  setPercent: (value: number | null) => void
}

export function useLocalLlmIntroSetup(
  backend: LocalLlmFirstRunBackend,
  callbacks: LocalLlmIntroSetupCallbacks
): () => void {
  const { setStep, setSetupError, setText, setPercent } = callbacks
  return useCallback(() => {
    void (async () => {
      setStep('setup')
      setSetupError(null)
      setText('Preparing local LLM…')
      setPercent(null)
      const result = await runLocalLlmFirstRunSetup({
        backend,
        getSettings: () => window.settings.get(),
        saveSettings: (input) => window.settings.save(input),
        acquireRuntime: () => window.settings.acquireLlamaRuntime(),
        downloadModel: (id) => window.settings.startLlamaModelDownload(id),
        applyLifecycle: () => window.settings.applyLlamaLifecycle()
      })
      if (!result.ok) {
        setSetupError(result.message)
        return
      }
      setText('Local LLM ready.')
      setPercent(100)
      setStep(nextSettingsIntroStepAfterLocalLlmSuccess())
    })()
  }, [backend, setPercent, setSetupError, setStep, setText])
}
