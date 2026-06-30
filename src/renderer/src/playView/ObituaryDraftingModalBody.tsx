import { useEffect, useState } from 'react'
import type { CharacterObituary } from '../../../shared/campaignHub/types'
import type { GenerateObituaryResult } from '../../../shared/campaignHub/obituary'
import { OBITUARY_GENERATION_FAILED_MESSAGE } from '../../../shared/campaignHub/obituary'
import { OBITUARY_DRAFTING_COPY } from './obituaryDraftingCopy'
import './obituaryDraftingModal.css'

type ObituaryModalPhase = 'generating' | 'ready' | 'failed'

function useObituaryGeneration(request: {
  campaignId: string
  characterId: string
  deathCause?: string
}) {
  const [phase, setPhase] = useState<ObituaryModalPhase>('generating')
  const [obituary, setObituary] = useState<CharacterObituary | null>(null)

  useEffect(() => {
    let active = true
    void window.turn
      .generateObituary(request)
      .then((result: GenerateObituaryResult) => {
        if (!active) {
          return
        }
        if (result.ok) {
          setObituary(result.obituary)
          setPhase('ready')
          return
        }
        setPhase('failed')
      })
      .catch(() => {
        if (active) {
          setPhase('failed')
        }
      })
    return () => {
      active = false
    }
  }, [request.campaignId, request.characterId, request.deathCause])

  return { phase, obituary }
}

function ObituaryModalContent(props: {
  phase: ObituaryModalPhase
  obituary: CharacterObituary | null
  onDismiss: () => void
}): JSX.Element {
  return (
    <div className="obituary-modal">
      {props.phase === 'generating' ? (
        <>
          <h2 id="obituary-modal-title">{OBITUARY_DRAFTING_COPY}</h2>
          <p className="obituary-progress" aria-busy="true">
            The chroniclers are gathering your story…
          </p>
        </>
      ) : null}
      {props.phase === 'ready' && props.obituary ? (
        <>
          <h2 id="obituary-modal-title">In Memoriam</h2>
          <p className="obituary-body">{props.obituary.narrativeBody}</p>
          {props.obituary.npcReactions.length > 0 ? (
            <ul className="obituary-reactions">
              {props.obituary.npcReactions.map((reaction) => (
                <li key={reaction.npcId} className="obituary-reaction">
                  <span className="obituary-reaction-name">{reaction.npcName}</span>
                  {reaction.reaction}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {props.phase === 'failed' ? (
        <>
          <h2 id="obituary-modal-title">In Memoriam</h2>
          <p className="obituary-fallback">{OBITUARY_GENERATION_FAILED_MESSAGE}</p>
        </>
      ) : null}
      {props.phase !== 'generating' ? (
        <button type="button" className="obituary-dismiss" onClick={props.onDismiss}>
          Return to Campaign Hub
        </button>
      ) : null}
    </div>
  )
}

export function ObituaryDraftingModalBody(props: {
  request: { campaignId: string; characterId: string; deathCause?: string }
  onDismiss: () => void
}): JSX.Element {
  const { phase, obituary } = useObituaryGeneration(props.request)
  return (
    <div className="obituary-overlay" role="dialog" aria-modal="true" aria-labelledby="obituary-modal-title">
      <ObituaryModalContent phase={phase} obituary={obituary} onDismiss={props.onDismiss} />
    </div>
  )
}
