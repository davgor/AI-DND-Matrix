import { useEffect, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import { resolveDefaultPlaySheetTab, type PlaySheetTab } from './playSheetRailTabs'

export function usePlaySheetRailState(input: {
  campaignId: string
  characterId: string
  refreshToken: number
  combatState: CombatStateSnapshot | null
}): {
  character: Character | null
  activeTab: PlaySheetTab
  setActiveTab: (tab: PlaySheetTab) => void
} {
  const [character, setCharacter] = useState<Character | null>(null)
  const [activeTab, setActiveTab] = useState<PlaySheetTab>(() =>
    resolveDefaultPlaySheetTab(input.combatState !== null)
  )

  useEffect(() => {
    let cancelled = false
    void window.characters.listByCampaign(input.campaignId).then((characters) => {
      if (!cancelled) {
        setCharacter(characters.find((entry) => entry.id === input.characterId) ?? null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [input.campaignId, input.characterId, input.refreshToken])

  useEffect(() => {
    if (input.combatState !== null) {
      setActiveTab('combat')
    }
  }, [input.combatState])

  return { character, activeTab, setActiveTab }
}
