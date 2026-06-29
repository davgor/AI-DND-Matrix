import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignStartFlow } from './useCampaignStartFlow'
import { CampaignStartFormActions, CampaignStartFormFields } from './CampaignStartFormFields'
import './campaignStart.css'

export interface CampaignStartModalProps {
  flow: CampaignStartFlow
  onSuccess: (detail: CampaignDetail) => void
}

export function CampaignStartModal(props: CampaignStartModalProps): JSX.Element | null {
  const { flow } = props
  if (flow.view === 'closed') {
    return null
  }

  return (
    <div className="campaign-start-overlay" role="presentation" onClick={() => flow.close()}>
      <div
        className="campaign-start-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-start-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            flow.close()
          }
        }}
      >
        {flow.view === 'loading' ? (
          <CampaignStartLoading flow={flow} />
        ) : (
          <CampaignStartForm flow={flow} onSuccess={props.onSuccess} />
        )}
      </div>
    </div>
  )
}

function CampaignStartLoading(props: { flow: CampaignStartFlow }): JSX.Element {
  return (
    <div className="campaign-start-loading" role="status" aria-live="polite">
      <h2 id="campaign-start-title">Forging your campaign</h2>
      <p>{props.flow.progressLabel || 'Creating your campaign'}</p>
      <div className="campaign-start-progress-track" aria-hidden="true">
        <div className="campaign-start-progress-fill campaign-start-progress-indeterminate" />
      </div>
    </div>
  )
}

function CampaignStartForm(props: {
  flow: CampaignStartFlow
  onSuccess: (detail: CampaignDetail) => void
}): JSX.Element {
  const { flow } = props
  const isError = flow.view === 'error'

  async function handleSubmit(): Promise<void> {
    const detail = isError ? await flow.retry() : await flow.submit()
    if (detail) {
      props.onSuccess(detail)
    }
  }

  return (
    <>
      <CampaignStartFormFields flow={flow} isError={isError} />
      <CampaignStartFormActions flow={flow} isError={isError} onSubmit={() => void handleSubmit()} />
    </>
  )
}
