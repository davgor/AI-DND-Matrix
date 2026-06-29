import { useEffect, useState } from 'react'
import { resolveInCampaignLayoutMode } from '../../../shared/inCampaignLayout/breakpoints'
import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'

export function useInCampaignLayoutMode(): InCampaignLayoutMode {
  const [mode, setMode] = useState<InCampaignLayoutMode>(() =>
    resolveInCampaignLayoutMode(window.innerWidth)
  )

  useEffect(() => {
    function handleResize(): void {
      setMode(resolveInCampaignLayoutMode(window.innerWidth))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return mode
}
