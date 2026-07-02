import { useEffect } from 'react'
import type { Character } from '../../../db/repositories/characters'
import { ModalPortal } from '../shared/ModalPortal'
import { SpellbookModalBody } from './SpellbookModalBody'
import { useCharacterSpellbook } from './useCharacterSpellbook'
import './spellbook.css'

export interface SpellbookModalProps {
  character: Character
  isOpen: boolean
  refreshToken?: number
  onClose: () => void
}

export function SpellbookModal(props: SpellbookModalProps): JSX.Element | null {
  const spellbook = useCharacterSpellbook(props.character.id, props.isOpen, props.refreshToken ?? 0)

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
      <div className="spellbook-overlay modal-overlay" role="presentation" onClick={props.onClose}>
        <div
          className="spellbook-modal modal-panel"
          role="dialog"
          aria-labelledby="spellbook-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="spellbook-header">
            <div>
              <p className="eyebrow">Abilities</p>
              <h2 id="spellbook-title">{props.character.name}&apos;s Spellbook</h2>
            </div>
            <button
              type="button"
              className="character-log-book-close"
              aria-label="Close spellbook"
              onClick={props.onClose}
            >
              ×
            </button>
          </header>
          <SpellbookModalBody spells={spellbook.spells} loading={spellbook.loading} />
        </div>
      </div>
    </ModalPortal>
  )
}
