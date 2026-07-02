import { describe, expect, it } from 'vitest'
import { InCampaignLayout } from './InCampaignLayout'

describe('InCampaignLayout overlay chrome', () => {
  it('renders overlay backdrop class when showOverlayBackdrop is true', () => {
    const node = InCampaignLayout({
      mode: 'compact',
      campaignsCollapsed: false,
      sheetCollapsed: true,
      showOverlayBackdrop: true,
      onBackdropDismiss: () => {},
      campaigns: <div className="test-campaigns">C</div>,
      dmExposition: <div>DM</div>,
      playerInteraction: <div>Player</div>,
      playerSheet: <div>Sheet</div>
    })

    expect(node.props.className).toContain('in-campaign-layout--compact')
    const backdrop = (node.props.children as JSX.Element[])[0]
    expect(backdrop.props.className).toBe('in-campaign-overlay-backdrop')
  })

  it('combines sheet-overlay mode with collapsed campaigns class', () => {
    const node = InCampaignLayout({
      mode: 'sheet-overlay',
      campaignsCollapsed: true,
      sheetCollapsed: false,
      campaigns: <div>C</div>,
      dmExposition: <div>DM</div>,
      playerInteraction: <div>Player</div>,
      playerSheet: <div>Sheet</div>
    })

    expect(node.props.className).toBe(
      'in-campaign-layout in-campaign-layout--sheet-overlay in-campaign-layout--campaigns-collapsed'
    )
  })
})
