import { listLevelXpRanges, resolveXpProgress } from '../../../engine/xp'
import type { Character } from '../../../db/repositories/characters'
import './characterXp.css'

function formatXp(value: number): string {
  return value.toLocaleString()
}

export function CharacterXpSection(props: { character: Character; compact: boolean }): JSX.Element {
  const progress = resolveXpProgress(props.character.xp)
  const barLabel = progress.isMaxLevel
    ? `Level ${progress.level} — maximum`
    : `${formatXp(progress.xpIntoLevel)} / ${formatXp(progress.xpNeededForNext ?? 0)} XP toward Level ${progress.level + 1}`

  return (
    <section className="character-xp-section" aria-label="Experience progress">
      <div className="character-xp-header">
        <h3>Experience</h3>
        <span className="character-xp-total">{formatXp(progress.totalXp)} XP total</span>
      </div>
      <div
        className="character-xp-bar"
        role="progressbar"
        aria-valuenow={Math.round(progress.progressRatio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={barLabel}
      >
        <div className="character-xp-bar-fill" style={{ width: `${progress.progressRatio * 100}%` }} />
      </div>
      <p className="character-xp-bar-label">{barLabel}</p>
      {props.compact ? null : <CharacterLevelTable currentLevel={progress.level} />}
    </section>
  )
}

function CharacterLevelTable(props: { currentLevel: number }): JSX.Element {
  const ranges = listLevelXpRanges()
  return (
    <details className="character-level-table">
      <summary>Level XP thresholds</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">Level</th>
            <th scope="col">Min XP</th>
            <th scope="col">XP in level</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map((row) => (
            <tr
              key={row.level}
              className={row.level === props.currentLevel ? 'character-level-row-current' : undefined}
            >
              <td>{row.level}</td>
              <td>{formatXp(row.minXp)}</td>
              <td>{row.xpToNext === null ? '—' : formatXp(row.xpToNext)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
