import { useEffect } from 'react'
import type { Character } from '../../../db/repositories/characters'
import { ModalPortal } from '../shared/ModalPortal'
import { AskDmModalBody } from './AskDmModalBody'
import { AskDmModalHeader } from './AskDmModalHeader'
import { useAskDmChat } from './useAskDmChat'
import './askDm.css'
export interface AskDmModalProps {
  character: Character
  campaignId: string
  isOpen: boolean
  onClose: () => void
}

export function AskDmModal(props: AskDmModalProps): JSX.Element | null {
  const chat = useAskDmChat({
    campaignId: props.campaignId,
    characterId: props.character.id,
    isOpen: props.isOpen
  })

  useEffect(() => {
    if (!props.isOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        props.onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props.isOpen, props.onClose])

  if (!props.isOpen) {
    return null
  }

  return (
    <ModalPortal>
      <div className="ask-dm-overlay modal-overlay" role="presentation" onClick={props.onClose}>
        <div
          className="ask-dm-modal modal-panel"
          role="dialog"
          aria-labelledby="ask-dm-title"
          onClick={(event) => event.stopPropagation()}
        >
          <AskDmModalHeader onClose={props.onClose} />
          <AskDmModalBody            messages={chat.messages}
            loading={chat.loading}
            sending={chat.sending}
            error={chat.error}
            inputValue={chat.inputValue}
            onInputChange={chat.setInputValue}
            onSend={() => void chat.sendMessage()}
          />
        </div>
      </div>
    </ModalPortal>
  )
}
