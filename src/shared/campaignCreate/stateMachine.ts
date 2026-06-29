export type CampaignStartView = 'closed' | 'form' | 'loading' | 'error'

const ALLOWED: Record<CampaignStartView, readonly CampaignStartView[]> = {
  closed: ['form'],
  form: ['closed', 'loading'],
  loading: ['error', 'closed'],
  error: ['form', 'loading', 'closed']
}

export function canCampaignStartTransition(from: CampaignStartView, to: CampaignStartView): boolean {
  return ALLOWED[from].includes(to)
}

export function assertCampaignStartTransition(from: CampaignStartView, to: CampaignStartView): void {
  if (!canCampaignStartTransition(from, to)) {
    throw new Error(`Illegal campaign start transition: ${from} -> ${to}`)
  }
}
