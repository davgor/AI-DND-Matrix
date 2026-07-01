import { useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import type { QuestKind, QuestScale } from '../../../shared/quests/types'
import { QuestLogModalBody } from './QuestLogModalBody'
import { useCharacterQuestLog } from './useCharacterQuestLog'
import './questLog.css'

export interface QuestLogModalProps {
  character: Character
  campaignId: string
  isOpen: boolean
  refreshToken?: number
  onClose: () => void
}

function QuestLogHeader(props: {
  characterName: string
  curateMode: boolean
  onCurateChange: (value: boolean) => void
  onClose: () => void
}): JSX.Element {
  return (
    <header className="quest-log-header">
      <div>
        <p className="eyebrow">Objectives</p>
        <h2 id="quest-log-title">{props.characterName}&apos;s Quest Log</h2>
      </div>
      <div className="quest-log-header-actions">
        <label className="character-log-book-curate-toggle">
          <input type="checkbox" checked={props.curateMode} onChange={(event) => props.onCurateChange(event.target.checked)} />
          Curate
        </label>
        <button type="button" className="character-log-book-close" aria-label="Close quest log" onClick={props.onClose}>
          ×
        </button>
      </div>
    </header>
  )
}

function QuestCuratePanel(props: {
  campaignId: string
  characterId: string
  onCreated: () => void
}): JSX.Element {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [scale, setScale] = useState<QuestScale>('minor')
  const handleCreate = (): void => {
    void window.quests
      .create({
        campaignId: props.campaignId,
        characterId: props.characterId,
        kind: 'side' as QuestKind,
        title,
        summary,
        scale,
        objectives: summary ? [{ id: 'obj-1', text: summary, done: false }] : []
      })
      .then(() => {
        setTitle('')
        setSummary('')
        props.onCreated()
      })
  }
  return (
    <section className="quest-log-section">
      <h3>DM: Add side quest</h3>
      <div className="quest-log-curate-form">
        <input value={title} placeholder="Title" onChange={(event) => setTitle(event.target.value)} />
        <textarea value={summary} placeholder="Summary" onChange={(event) => setSummary(event.target.value)} />
        <select value={scale} onChange={(event) => setScale(event.target.value as QuestScale)}>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
        </select>
        <button type="button" onClick={handleCreate} disabled={!title.trim()}>
          Create active quest
        </button>
      </div>
    </section>
  )
}

export function QuestLogModal(props: QuestLogModalProps): JSX.Element | null {
  const questLog = useCharacterQuestLog(props.character.id, props.isOpen, props.refreshToken ?? 0)
  const [curateMode, setCurateMode] = useState(false)
  if (!props.isOpen) {
    return null
  }
  const refresh = (): void => {
    void questLog.refresh()
  }
  return (
    <div className="quest-log-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      <div className="quest-log-modal modal-panel" role="dialog" aria-labelledby="quest-log-title" onClick={(event) => event.stopPropagation()}>
        <QuestLogHeader characterName={props.character.name} curateMode={curateMode} onCurateChange={setCurateMode} onClose={props.onClose} />
        <QuestLogModalBody
          entries={questLog.entries}
          loading={questLog.loading}
          curateMode={curateMode}
          onAccept={(questId) => void window.quests.accept({ characterId: props.character.id, questId }).then(refresh)}
          onAbandon={(questId) => {
            if (window.confirm('Abandon this quest?')) {
              void window.quests.abandon({ characterId: props.character.id, questId }).then(refresh)
            }
          }}
          onForceComplete={(questId) =>
            void window.quests.forceStatus({ characterId: props.character.id, questId, status: 'completed' }).then(refresh)
          }
          curatePanel={
            curateMode ? (
              <QuestCuratePanel campaignId={props.campaignId} characterId={props.character.id} onCreated={refresh} />
            ) : null
          }
        />
      </div>
    </div>
  )
}
