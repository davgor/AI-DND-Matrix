import type { PromotionPromptController } from './usePromotionPrompt'

export interface PromotionPromptProps {
  promotion: PromotionPromptController
}

export function PromotionPrompt(props: PromotionPromptProps): JSX.Element | null {
  const { promotion } = props
  if (!promotion.proposed) {
    return null
  }

  return (
    <div className="play-view-promotion">
      <p>Recruit {promotion.proposed.npcName} into the party?</p>
      <button type="button" disabled={promotion.confirming} onClick={() => void promotion.confirm()}>
        {promotion.confirming ? 'Recruiting...' : 'Confirm'}
      </button>
      <button type="button" disabled={promotion.confirming} onClick={promotion.decline}>
        Decline
      </button>
    </div>
  )
}
