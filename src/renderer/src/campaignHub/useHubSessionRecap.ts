import { useEffect, useState } from 'react'

export type HubSessionRecapState =
  | { status: 'loading' }
  | { status: 'ready'; text: string }

export function useHubSessionRecap(campaignId: string | undefined): HubSessionRecapState {
  const [state, setState] = useState<HubSessionRecapState>({ status: 'loading' })

  useEffect(() => {
    if (campaignId === undefined) {
      setState({ status: 'loading' })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    void window.campaigns.getOrGenerateSessionRecap(campaignId).then((result) => {
      if (!cancelled) {
        setState({ status: 'ready', text: result.text })
      }
    })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  return state
}
