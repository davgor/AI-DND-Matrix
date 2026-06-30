import { useCallback, useEffect, useState } from 'react'
import type { SettingsIntroState } from '../../../shared/settingsIntro/types'

export interface SettingsIntroController {
  visible: boolean
  highlightSettings: boolean
  openSettings: () => void
  dismiss: () => void
  handleSettingsOpenChange: (open: boolean) => void
}

export function useSettingsIntro(
  enabled: boolean,
  settingsOpen: boolean,
  onSettingsOpenChange: (open: boolean) => void
): SettingsIntroController {
  const [state, setState] = useState<SettingsIntroState | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }
    let cancelled = false
    void window.settingsIntro.getState().then((next) => {
      if (!cancelled) {
        setState(next)
      }
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const dismiss = useCallback(() => {
    void window.settingsIntro.dismiss()
    setState((current) => (current ? { ...current, shouldShow: false } : current))
  }, [])

  const openSettings = useCallback(() => {
    void window.settingsIntro.dismiss()
    setState((current) => (current ? { ...current, shouldShow: false } : current))
    onSettingsOpenChange(true)
  }, [onSettingsOpenChange])

  const handleSettingsOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        void window.settingsIntro.dismiss()
        setState((current) => (current ? { ...current, shouldShow: false } : current))
      }
      onSettingsOpenChange(open)
    },
    [onSettingsOpenChange]
  )

  const visible = enabled && state?.shouldShow === true && !settingsOpen

  return {
    visible,
    highlightSettings: visible,
    openSettings,
    dismiss,
    handleSettingsOpenChange
  }
}
