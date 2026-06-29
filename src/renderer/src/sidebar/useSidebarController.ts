import { useEffect, useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import { getSidebarCollapsed, setSidebarCollapsed } from './sidebarPreferences'

export interface SidebarController {
  campaigns: CampaignWithLastPlayed[]
  collapsed: boolean
  toggleCollapsed: () => void
  handleSelect: (campaignId: string) => Promise<void>
  handleOpenNewCampaign: () => void
  refreshCampaigns: () => Promise<void>
}

export interface SidebarCallbacks {
  onCampaignSelected: (detail: CampaignDetail) => void
  onOpenNewCampaign: () => void
}

export function useSidebarController(callbacks: SidebarCallbacks): SidebarController {
  const [campaigns, setCampaigns] = useState<CampaignWithLastPlayed[]>([])
  const [collapsed, setCollapsed] = useState(() => getSidebarCollapsed(window.localStorage))

  async function refreshCampaigns(): Promise<void> {
    setCampaigns(await window.campaigns.list())
  }

  useEffect(() => {
    void refreshCampaigns()
  }, [])

  function toggleCollapsed(): void {
    const next = !collapsed
    setCollapsed(next)
    setSidebarCollapsed(window.localStorage, next)
  }

  async function handleSelect(campaignId: string): Promise<void> {
    const detail = await window.campaigns.select(campaignId)
    callbacks.onCampaignSelected(detail)
    await refreshCampaigns()
  }

  function handleOpenNewCampaign(): void {
    callbacks.onOpenNewCampaign()
  }

  return {
    campaigns,
    collapsed,
    toggleCollapsed,
    handleSelect,
    handleOpenNewCampaign,
    refreshCampaigns
  }
}
