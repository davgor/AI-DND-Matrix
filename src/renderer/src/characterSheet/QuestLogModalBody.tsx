import type { CharacterQuestView } from '../../../shared/quests/types'
import { QuestLogSection } from './QuestLogSections'
import { groupQuestViews } from './useCharacterQuestLog'

export function QuestLogModalBody(props: {
  entries: CharacterQuestView[]
  loading: boolean
  curateMode: boolean
  onAccept: (questId: string) => void
  onAbandon: (questId: string) => void
  onForceComplete: (questId: string) => void
  curatePanel: JSX.Element | null
}): JSX.Element {
  const grouped = groupQuestViews(props.entries)
  return (
    <div className="quest-log-body">
      {props.loading ? <p className="quest-log-empty">Loading quests…</p> : null}
      {!props.loading && grouped.main ? (
        <QuestLogSection
          title="Main story"
          hookLine={grouped.main.quest.hookLine}
          views={[grouped.main]}
          curateMode={props.curateMode}
          onForceComplete={props.curateMode ? props.onForceComplete : undefined}
        />
      ) : null}
      {!props.loading && !grouped.main ? (
        <p className="quest-log-empty">Main story quest not seeded yet.</p>
      ) : null}
      <p className="quest-log-empty">Main story is always tracked. Side quests are opt-in.</p>
      <QuestLogSection
        title="Active side quests"
        views={grouped.active}
        curateMode={props.curateMode}
        onAbandon={props.onAbandon}
        onForceComplete={props.curateMode ? props.onForceComplete : undefined}
      />
      <QuestLogSection
        title="Available"
        views={grouped.available}
        curateMode={props.curateMode}
        onAccept={props.onAccept}
      />
      <QuestLogSection title="Completed" views={grouped.completed} curateMode={props.curateMode} />
      {props.curatePanel}
    </div>
  )
}
