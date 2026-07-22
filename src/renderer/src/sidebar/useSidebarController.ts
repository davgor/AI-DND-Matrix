import { useEffect, useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import { getSidebarCollapsed, setSidebarCollapsed } from './sidebarPreferences'
import { createSidebarPortabilityApi } from './sidebarPortabilityApi'

export interface SidebarController {
  campaigns: CampaignWithLastPlayed[]
  collapsed: boolean
  portabilityError: string | null
  clearPortabilityError: () => void
  toggleCollapsed: () => void
  handleSelect: (campaignId: string) => Promise<void>
  handleOpenNewCampaign: () => void
  refreshCampaigns: () => Promise<void>
  exportCampaign: (campaignId: string) => Promise<void>
  importCampaign: () => Promise<void>
  duplicateCampaign: (campaignId: string) => Promise<void>
}

export interface SidebarCallbacks {
  onCampaignSelected: (detail: CampaignDetail) => void
  onOpenNewCampaign: () => void
}

export function useSidebarController(callbacks: SidebarCallbacks): SidebarController {
  const [campaigns, setCampaigns] = useState<CampaignWithLastPlayed[]>([])
  const [collapsed, setCollapsed] = useState(() => getSidebarCollapsed(window.localStorage))
  const [portabilityError, setPortabilityError] = useState<string | null>(null)

  async function refreshCampaigns(): Promise<void> {
    setCampaigns(await window.campaigns.list())
  }

  useEffect(() => {
    void refreshCampaigns()
  }, [])

  const portability = createSidebarPortabilityApi({ setPortabilityError, refreshCampaigns })

  return {
    campaigns,
    collapsed,
    portabilityError,
    clearPortabilityError: portability.clearPortabilityError,
    toggleCollapsed: () => {
      const next = !collapsed
      setCollapsed(next)
      setSidebarCollapsed(window.localStorage, next)
    },
    handleSelect: async (campaignId) => {
      const detail = await window.campaigns.select(campaignId)
      callbacks.onCampaignSelected(detail)
      await refreshCampaigns()
    },
    handleOpenNewCampaign: () => callbacks.onOpenNewCampaign(),
    refreshCampaigns,
    exportCampaign: portability.exportCampaign,
    importCampaign: portability.importCampaign,
    duplicateCampaign: portability.duplicateCampaign
  }
}
