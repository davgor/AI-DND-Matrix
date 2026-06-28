import { useState } from 'react'
import type { CampaignDetail } from '../../main/campaignIpc'
import './app.css'
import { MainPanel } from './mainPanel/MainPanel'
import { Sidebar } from './sidebar/Sidebar'
import { Titlebar } from './titlebar/Titlebar'

export function App(): JSX.Element {
  const [detail, setDetail] = useState<CampaignDetail | null>(null)

  return (
    <div>
      <Titlebar />
      <div className="app-body">
        <Sidebar selectedCampaignId={detail?.campaign?.id ?? null} onCampaignDetail={setDetail} />
        <MainPanel detail={detail} />
      </div>
    </div>
  )
}
