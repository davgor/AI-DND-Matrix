import { useEffect, useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { Character } from '../../../db/repositories/characters'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import { buildChromeData, type PlaySessionChromeData } from './playSessionChromeData'

export type { PlaySessionChromeData } from './playSessionChromeData'

export function usePlaySessionChromeData(
  campaignId: string,
  characterId: string,
  refreshToken: number
): PlaySessionChromeData & { regionBlurb: string | null } {
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.campaigns.select(campaignId).then((next) => {
      if (!cancelled) {
        setDetail(next)
      }
    })
    return () => {
      cancelled = true
    }
  }, [campaignId, refreshToken])

  useEffect(() => {
    let cancelled = false
    void window.characters.listByCampaign(campaignId).then((characters) => {
      if (!cancelled) {
        setCharacter(characters.find((entry) => entry.id === characterId) ?? null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [campaignId, characterId, refreshToken])

  return buildChromeData(detail, character)
}

export function isCombatActive(combatState: CombatStateSnapshot | null | undefined): boolean {
  return combatState !== null && combatState !== undefined
}

export function combatBadgeSummary(combatState: CombatStateSnapshot): string {
  const active = combatState.initiativeOrder.find((entry) => entry.isActive)
  return `Round ${combatState.round}${active ? ` — ${active.name}'s turn` : ''}`
}
