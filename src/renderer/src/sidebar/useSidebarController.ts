import { useEffect, useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import { getSidebarCollapsed, setSidebarCollapsed } from './sidebarPreferences'

export interface SidebarController {
  campaigns: CampaignWithLastPlayed[]
  collapsed: boolean
  premisePrompt: string
  generating: boolean
  toggleCollapsed: () => void
  setPremisePrompt: (value: string) => void
  handleSelect: (campaignId: string) => Promise<void>
  handleGenerate: () => Promise<void>
}

export interface SidebarCallbacks {
  onCampaignSelected: (detail: CampaignDetail) => void
  onCampaignGenerated: (detail: CampaignDetail) => void
}

export function useSidebarController(callbacks: SidebarCallbacks): SidebarController {
  const [campaigns, setCampaigns] = useState<CampaignWithLastPlayed[]>([])
  const [collapsed, setCollapsed] = useState(() => getSidebarCollapsed(window.localStorage))
  const [premisePrompt, setPremisePrompt] = useState('')
  const [generating, setGenerating] = useState(false)

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

  async function handleGenerate(): Promise<void> {
    if (!premisePrompt.trim()) {
      return
    }
    setGenerating(true)
    try {
      const detail = await window.campaigns.generate(premisePrompt)
      setPremisePrompt('')
      callbacks.onCampaignGenerated(detail)
      await refreshCampaigns()
    } finally {
      setGenerating(false)
    }
  }

  return {
    campaigns,
    collapsed,
    premisePrompt,
    generating,
    toggleCollapsed,
    setPremisePrompt,
    handleSelect,
    handleGenerate
  }
}
