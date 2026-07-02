import { useState } from 'react'

export interface SessionRecapController {
  visible: boolean
  text: string | null
  loading: boolean
  open: () => Promise<void>
  show: () => void
  generate: () => Promise<void>
  view: () => Promise<void>
  skip: () => void
}

export function useSessionRecap(campaignId: string): SessionRecapController {
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate(): Promise<void> {
    setLoading(true)
    try {
      setText(await window.campaigns.generateRecap(campaignId))
    } finally {
      setLoading(false)
    }
  }

  async function open(): Promise<void> {
    setVisible(true)
    if (text === null && !loading) {
      await generate()
    }
  }

  return {
    visible,
    text,
    loading,
    open,
    show: () => setVisible(true),
    generate,
    view: generate,
    skip: () => setVisible(false)
  }
}
