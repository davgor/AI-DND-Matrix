import type { CharacterQuestView, Quest } from '../../../shared/quests/types'
import { FormattedText } from '../shared/FormattedText'
import { QuestAbandonButton, QuestAcceptButton, QuestCurateButtons } from './QuestCardActions'

function shouldShowQuestSummary(quest: Quest): boolean {
  const summary = quest.summary.trim()
  if (!summary) {
    return false
  }
  if (quest.objectives.length === 0) {
    return true
  }
  return !quest.objectives.every((objective) => objective.text.trim() === summary)
}

function QuestBadges(props: { view: CharacterQuestView }): JSX.Element {
  return (
    <div className="quest-log-badges">
      <span className="quest-log-badge">{props.view.characterQuest.status}</span>
      <span className="quest-log-badge">{props.view.quest.scale}</span>
      {props.view.regionName ? <span className="quest-log-badge">{props.view.regionName}</span> : null}
    </div>
  )
}

function QuestObjectives(props: { view: CharacterQuestView }): JSX.Element {
  return (
    <ul className="quest-log-objectives">
      {props.view.quest.objectives.map((objective) => (
        <li key={objective.id} className={`quest-log-objective${objective.done ? ' done' : ''}`}>
          <input type="checkbox" checked={objective.done} readOnly aria-label={objective.text} />
          <span>{objective.text}</span>
        </li>
      ))}
    </ul>
  )
}

export function QuestLogCard(props: {
  view: CharacterQuestView
  curateMode: boolean
  onAccept?: () => void
  onAbandon?: () => void
  onEdit?: () => void
  onForceComplete?: () => void
}): JSX.Element {
  const { view } = props
  const completedDate = view.characterQuest.completedInGameDate

  return (
    <article className="quest-log-card">
      <div className="quest-log-card-header">
        <h4 className="quest-log-card-title">{view.quest.title}</h4>
        <QuestBadges view={view} />
      </div>
      {shouldShowQuestSummary(view.quest)
        ? FormattedText({ as: 'p', className: 'quest-log-card-summary', text: view.quest.summary })
        : null}
      <QuestObjectives view={view} />
      {completedDate !== null ? (
        <p className="quest-log-empty">Completed on day {completedDate}</p>
      ) : null}
      <div className="quest-log-card-actions">
        <QuestAcceptButton onAccept={view.characterQuest.status === 'available' ? props.onAccept : undefined} />
        <QuestAbandonButton onAbandon={view.characterQuest.status === 'active' ? props.onAbandon : undefined} />
        <QuestCurateButtons curateMode={props.curateMode} onEdit={props.onEdit} onForceComplete={props.onForceComplete} />
      </div>
    </article>
  )
}

export function QuestLogSection(props: {
  title: string
  views: CharacterQuestView[]
  hookLine?: string | null
  curateMode: boolean
  onAccept?: (questId: string) => void
  onAbandon?: (questId: string) => void
  onEdit?: (questId: string) => void
  onForceComplete?: (questId: string) => void
}): JSX.Element | null {
  if (props.views.length === 0 && !props.hookLine) {
    return null
  }

  return (
    <section className="quest-log-section">
      <h3>{props.title}</h3>
      {props.hookLine ? <p className="quest-log-hook">{props.hookLine}</p> : null}
      {props.views.map((view) => (
        <QuestLogCard
          key={view.quest.id}
          view={view}
          curateMode={props.curateMode}
          onAccept={props.onAccept ? () => props.onAccept!(view.quest.id) : undefined}
          onAbandon={props.onAbandon ? () => props.onAbandon!(view.quest.id) : undefined}
          onEdit={props.onEdit ? () => props.onEdit!(view.quest.id) : undefined}
          onForceComplete={
            props.onForceComplete ? () => props.onForceComplete!(view.quest.id) : undefined
          }
        />
      ))}
    </section>
  )
}
