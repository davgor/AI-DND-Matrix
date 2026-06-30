import { useCallback, useState } from 'react'
import type { ObituaryDraftingRequest } from './ObituaryDraftingModal'

export function useObituaryDrafting() {
  const [request, setRequest] = useState<ObituaryDraftingRequest | null>(null)

  const beginObituaryDrafting = useCallback((next: ObituaryDraftingRequest) => {
    setRequest(next)
  }, [])

  const clearObituaryDrafting = useCallback(() => {
    setRequest(null)
  }, [])

  return {
    obituaryRequest: request,
    beginObituaryDrafting,
    clearObituaryDrafting,
    obituaryBlocking: request !== null
  }
}
