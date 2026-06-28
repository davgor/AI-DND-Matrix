import { useState } from 'react'

export interface SessionRecapController {
  visible: boolean
  text: string | null
  loading: boolean
  show: () => void
  view: () => Promise<void>
  skip: () => void
}

export function useSessionRecap(campaignId: string): SessionRecapController {
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function view(): Promise<void> {
    setLoading(true)
    try {
      setText(await window.campaigns.generateRecap(campaignId))
    } finally {
      setLoading(false)
    }
  }

  return {
    visible,
    text,
    loading,
    show: () => setVisible(true),
    view,
    skip: () => setVisible(false)
  }
}
