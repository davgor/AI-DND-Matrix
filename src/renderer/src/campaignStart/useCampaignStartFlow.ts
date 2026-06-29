import { useRef } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignSetupFormValues } from '../../../shared/campaignCreate/types'
import { executeCampaignCreate } from './executeCampaignCreate'
import { useCampaignCreateProgress } from './useCampaignCreateProgress'
import { useCampaignStartModalState } from './useCampaignStartModalState'

export interface CampaignStartFlow {
  view: ReturnType<typeof useCampaignStartModalState>['view']
  form: CampaignSetupFormValues
  fieldError: string | null
  flowError: string | null
  submitting: boolean
  progressStage: ReturnType<typeof useCampaignCreateProgress>['progressStage']
  progressLabel: string
  open: () => void
  close: () => void
  updateForm: (patch: Partial<CampaignSetupFormValues>) => void
  submit: () => Promise<CampaignDetail | null>
  retry: () => Promise<CampaignDetail | null>
  backToForm: () => void
}

function newSessionId(): string {
  return crypto.randomUUID()
}

export function useCampaignStartFlow(): CampaignStartFlow {
  const modal = useCampaignStartModalState()
  const progress = useCampaignCreateProgress(modal.view)
  const sessionRef = useRef(newSessionId())

  function resetSession(): void {
    sessionRef.current = newSessionId()
  }

  function close(): void {
    modal.close()
    resetSession()
  }

  function backToForm(): void {
    modal.backToForm()
    resetSession()
  }

  async function runCreate(): Promise<CampaignDetail | null> {
    return executeCampaignCreate(modal.form, sessionRef.current, {
      setFieldError: modal.setFieldError,
      setFlowError: modal.setFlowError,
      setSubmitting: modal.setSubmitting,
      setProgressStage: progress.clearProgress,
      setProgressLabel: progress.setProgressLabel,
      transition: modal.transition,
      resetForm: modal.resetForm,
      newSession: resetSession
    })
  }

  return {
    view: modal.view,
    form: modal.form,
    fieldError: modal.fieldError,
    flowError: modal.flowError,
    submitting: modal.submitting,
    progressStage: progress.progressStage,
    progressLabel: progress.progressLabel,
    open: modal.open,
    close,
    updateForm: modal.updateForm,
    submit: runCreate,
    retry: async () => {
      resetSession()
      return runCreate()
    },
    backToForm
  }
}
