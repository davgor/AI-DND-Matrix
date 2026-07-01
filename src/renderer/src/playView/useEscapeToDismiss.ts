import { useEffect } from 'react'

export function useEscapeToDismiss(
  enabled: boolean,
  onDismiss: () => void
): void {
  useEffect(() => {
    if (!enabled) {
      return
    }
    function onEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onDismiss()
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [enabled, onDismiss])
}
