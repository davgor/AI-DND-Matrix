import { useEffect } from 'react'
import { applySpellcheckToEditableFields } from './applySpellcheck'

export function useSpellcheckOnEditableFields(): void {
  useEffect(() => {
    const apply = (): void => {
      applySpellcheckToEditableFields(document.body)
    }

    apply()

    const observer = new MutationObserver(apply)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type']
    })

    return () => observer.disconnect()
  }, [])
}
