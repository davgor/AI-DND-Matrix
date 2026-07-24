import { useCallback, useEffect, useState } from 'react'
import { nextSettingsIntroStepAfterLocalChoice } from '../../../shared/settingsIntro/wizardSteps'
import type { SettingsIntroWizardStep } from '../../../shared/settingsIntro/types'
import { formatLlamaDownloadProgress } from '../settings/formatLlamaDownloadProgress'
import { type LocalLlmFirstRunBackend } from './runLocalLlmFirstRunSetup'
import { declineLocalImagePrompt } from './runLocalImageFirstRunSetup'
import { useLocalLlmIntroSetup } from './useLocalLlmIntroSetup'

export interface SettingsIntroWizardController {
  step: SettingsIntroWizardStep
  backend: LocalLlmFirstRunBackend
  setupProgressText: string | null
  setupProgressPercent: number | null
  setupError: string | null
  chooseLocal: (wantLocal: boolean) => void
  setBackend: (backend: LocalLlmFirstRunBackend) => void
  startSetup: () => void
  retrySetup: () => void
  acceptImageSetup: () => void
  declineImageSetup: () => void
}

function useDownloadProgressSubscription(step: SettingsIntroWizardStep): {
  text: string | null
  percent: number | null
  setText: (value: string | null) => void
  setPercent: (value: number | null) => void
} {
  const [text, setText] = useState<string | null>(null)
  const [percent, setPercent] = useState<number | null>(null)
  useEffect(() => {
    if (step !== 'setup') {
      return
    }
    return window.settings.onLlamaDownloadProgress((payload) => {
      setText(formatLlamaDownloadProgress(payload))
      setPercent(
        payload.phase === 'downloading' || payload.phase === 'complete' ? payload.percent : null
      )
    })
  }, [step])
  return { text, percent, setText, setPercent }
}

export function useSettingsIntroWizard(
  onComplete: () => void,
  onOpenSettings?: () => void
): SettingsIntroWizardController {
  const [step, setStep] = useState<SettingsIntroWizardStep>('askLocal')
  const [backend, setBackend] = useState<LocalLlmFirstRunBackend>('vulkan')
  const [setupError, setSetupError] = useState<string | null>(null)
  const { text, percent, setText, setPercent } = useDownloadProgressSubscription(step)
  const runSetup = useLocalLlmIntroSetup(backend, { setStep, setSetupError, setText, setPercent })

  const declineImageSetup = useCallback(() => {
    void declineLocalImagePrompt({
      getSettings: () => window.settings.get(),
      saveSettings: (input) => window.settings.save(input)
    }).finally(onComplete)
  }, [onComplete])

  const acceptImageSetup = useCallback(() => {
    onComplete()
    onOpenSettings?.()
  }, [onComplete, onOpenSettings])

  return {
    step,
    backend,
    setupProgressText: text,
    setupProgressPercent: percent,
    setupError,
    chooseLocal: (wantLocal) => setStep(nextSettingsIntroStepAfterLocalChoice(wantLocal)),
    setBackend,
    startSetup: runSetup,
    retrySetup: runSetup,
    acceptImageSetup,
    declineImageSetup
  }
}
