import { useCallback, useState } from 'react'
import type { CampaignSetupFormValues } from '../../../shared/campaignCreate/types'
import { DEFAULT_CAMPAIGN_SETUP_FORM } from '../../../shared/campaignCreate/types'
import { normalizeFormValues } from '../../../shared/campaignCreate/validation'
import type { CampaignStartView } from '../../../shared/campaignCreate/stateMachine'
import { createTransition } from './executeCampaignCreate'

export function useCampaignStartModalState() {
  const [view, setView] = useState<CampaignStartView>('closed')
  const [form, setForm] = useState<CampaignSetupFormValues>(DEFAULT_CAMPAIGN_SETUP_FORM)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [flowError, setFlowError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const transition = useCallback(createTransition(setView), [])

  function resetForm(): void {
    setForm(DEFAULT_CAMPAIGN_SETUP_FORM)
  }

  function open(): void {
    transition('form')
    setFieldError(null)
    setFlowError(null)
  }

  function close(): void {
    if (submitting) {
      return
    }
    transition('closed')
    setFieldError(null)
    setFlowError(null)
    resetForm()
  }

  function updateForm(patch: Partial<CampaignSetupFormValues>): void {
    setForm((current) => normalizeFormValues({ ...current, ...patch }))
    setFieldError(null)
  }

  function backToForm(): void {
    transition('form')
    setFlowError(null)
  }

  return {
    view,
    form,
    fieldError,
    flowError,
    submitting,
    setFieldError,
    setFlowError,
    setSubmitting,
    transition,
    resetForm,
    open,
    close,
    updateForm,
    backToForm
  }
}
