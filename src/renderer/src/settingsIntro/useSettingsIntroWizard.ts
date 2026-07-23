import { useCallback, useEffect, useState } from 'react'
import { nextSettingsIntroStepAfterLocalChoice } from '../../../shared/settingsIntro/wizardSteps'
import type { SettingsIntroWizardStep } from '../../../shared/settingsIntro/types'
import { formatLlamaDownloadProgress } from '../settings/formatLlamaDownloadProgress'
import {
  runLocalLlmFirstRunSetup,
  type LocalLlmFirstRunBackend
} from './runLocalLlmFirstRunSetup'

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

export function useSettingsIntroWizard(onComplete: () => void): SettingsIntroWizardController {
  const [step, setStep] = useState<SettingsIntroWizardStep>('askLocal')
  const [backend, setBackend] = useState<LocalLlmFirstRunBackend>('vulkan')
  const [setupError, setSetupError] = useState<string | null>(null)
  const { text, percent, setText, setPercent } = useDownloadProgressSubscription(step)

  const runSetup = useCallback(async () => {
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
    onComplete()
  }, [backend, onComplete, setPercent, setText])

  return {
    step,
    backend,
    setupProgressText: text,
    setupProgressPercent: percent,
    setupError,
    chooseLocal: (wantLocal) => setStep(nextSettingsIntroStepAfterLocalChoice(wantLocal)),
    setBackend,
    startSetup: () => {
      void runSetup()
    },
    retrySetup: () => {
      void runSetup()
    }
  }
}
