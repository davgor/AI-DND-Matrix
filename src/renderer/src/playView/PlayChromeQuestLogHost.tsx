import { useEffect, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import { QuestLogModal } from '../characterSheet/QuestLogModal'

export function PlayChromeQuestLogHost(props: {
  campaignId: string
  characterId: string
  refreshToken: number
  isOpen: boolean
  onClose: () => void
}): JSX.Element | null {
  const [character, setCharacter] = useState<Character | null>(null)
  useEffect(() => {
    let cancelled = false
    void window.characters.listByCampaign(props.campaignId).then((characters) => {
      if (!cancelled) {
        setCharacter(characters.find((entry) => entry.id === props.characterId) ?? null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [props.campaignId, props.characterId, props.refreshToken])
  if (!character) {
    return null
  }
  return (
    <QuestLogModal
      character={character}
      campaignId={props.campaignId}
      isOpen={props.isOpen}
      refreshToken={props.refreshToken}
      onClose={props.onClose}
    />
  )
}
