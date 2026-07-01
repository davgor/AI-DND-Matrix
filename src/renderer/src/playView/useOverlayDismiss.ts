import { useCallback } from 'react'
import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'
import { useEscapeToDismiss } from './useEscapeToDismiss'

export function useOverlayDismiss(input: {
  layoutMode: InCampaignLayoutMode
  campaignsCollapsed: boolean
  sheetCollapsed: boolean
  onCollapseCampaigns: () => void
  onCollapseSheet: () => void
}): {
  showBackdrop: boolean
  onBackdropDismiss: () => void
} {
  const overlayMode = input.layoutMode === 'compact' || input.layoutMode === 'sheet-overlay'
  const campaignsOverlayOpen = overlayMode && !input.campaignsCollapsed
  const sheetOverlayOpen = overlayMode && !input.sheetCollapsed
  const showBackdrop = campaignsOverlayOpen || sheetOverlayOpen

  const onBackdropDismiss = useCallback(() => {
    if (campaignsOverlayOpen) {
      input.onCollapseCampaigns()
      return
    }
    if (sheetOverlayOpen) {
      input.onCollapseSheet()
    }
  }, [campaignsOverlayOpen, sheetOverlayOpen, input.onCollapseCampaigns, input.onCollapseSheet])

  useEscapeToDismiss(showBackdrop, onBackdropDismiss)

  return { showBackdrop, onBackdropDismiss }
}
