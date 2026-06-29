import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CreateCampaignResult } from '../../../main/campaignCreateIpc'
import { assertCampaignStartTransition } from '../../../shared/campaignCreate/stateMachine'
import type { CampaignStartView } from '../../../shared/campaignCreate/stateMachine'
import type { CampaignSetupFormValues } from '../../../shared/campaignCreate/types'
import {
  mapFormToCreateRequest,
  validateCampaignSetupForm
} from '../../../shared/campaignCreate/validation'

export interface CampaignCreateSetters {
  setFieldError: (value: string | null) => void
  setFlowError: (value: string | null) => void
  setSubmitting: (value: boolean) => void
  setProgressStage: () => void
  setProgressLabel: (value: string) => void
  transition: (to: CampaignStartView) => void
  resetForm: () => void
  newSession: () => void
}

export async function executeCampaignCreate(
  form: CampaignSetupFormValues,
  sessionId: string,
  setters: CampaignCreateSetters
): Promise<CampaignDetail | null> {
  const validationError = validateCampaignSetupForm(form)
  if (validationError) {
    setters.setFieldError(validationError)
    return null
  }
  setters.setSubmitting(true)
  setters.setFieldError(null)
  setters.setFlowError(null)
  setters.transition('loading')
  try {
    const result: CreateCampaignResult = await window.campaigns.create(
      mapFormToCreateRequest(form, sessionId)
    )
    if (!result.ok) {
      setters.setFlowError(result.message)
      setters.transition('error')
      return null
    }
    setters.transition('closed')
    setters.resetForm()
    setters.newSession()
    return result.detail
  } finally {
    setters.setSubmitting(false)
    setters.setProgressStage(null)
    setters.setProgressLabel('')
  }
}

export function createTransition(
  setView: (updater: (from: CampaignStartView) => CampaignStartView) => void
): (to: CampaignStartView) => void {
  return (to: CampaignStartView) => {
    setView((from) => {
      assertCampaignStartTransition(from, to)
      return to
    })
  }
}
