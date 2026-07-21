import { useCallback, useEffect, useState } from 'react'
import type { CompanionRosterEntry } from '../../../shared/partyMembers/types'
import { companionOrderDraftForSelection } from './playCompanionRosterLogic'

export interface PlayCompanionRosterController {
  entries: CompanionRosterEntry[]
  selectedId: string | null
  orderDraft: string
  savingOrder: boolean
  onSelect: (companionId: string) => void
  onOrderDraftChange: (text: string) => void
  onSaveOrder: () => void
}

function resolveSelectedCompanionId(
  current: string | null,
  rows: CompanionRosterEntry[]
): string | null {
  if (current && rows.some((row) => row.id === current)) {
    return current
  }
  return rows[0]?.id ?? null
}

function applySavedCompanionOrder(
  entries: CompanionRosterEntry[],
  selectedId: string,
  orderDraft: string
): CompanionRosterEntry[] {
  return entries.map((entry) =>
    entry.id === selectedId ? { ...entry, orderText: orderDraft.trim() || null } : entry
  )
}

export function usePlayCompanionRoster(
  playerCharacterId: string,
  refreshToken: number
): PlayCompanionRosterController {
  const [entries, setEntries] = useState<CompanionRosterEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [orderDraft, setOrderDraft] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)

  useEffect(() => {
    if (!window.companions?.listRoster) {
      setEntries([])
      return
    }
    void window.companions.listRoster({ playerCharacterId }).then((rows) => {
      setEntries(rows)
      setSelectedId((current) => resolveSelectedCompanionId(current, rows))
    })
  }, [playerCharacterId, refreshToken])

  useEffect(() => {
    setOrderDraft(companionOrderDraftForSelection(entries, selectedId))
  }, [entries, selectedId])

  const onSaveOrder = useCallback(() => {
    if (!selectedId || !window.companions?.setOrder) {
      return
    }
    setSavingOrder(true)
    void window.companions
      .setOrder({ companionId: selectedId, text: orderDraft })
      .then((result) => {
        if (result.ok) {
          setEntries((current) => applySavedCompanionOrder(current, selectedId, orderDraft))
        }
      })
      .finally(() => setSavingOrder(false))
  }, [orderDraft, selectedId])

  return {
    entries,
    selectedId,
    orderDraft,
    savingOrder,
    onSelect: setSelectedId,
    onOrderDraftChange: setOrderDraft,
    onSaveOrder
  }
}
