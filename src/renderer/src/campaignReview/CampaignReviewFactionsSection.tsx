import type { Deity } from '../../../db/repositories/deities'
import type {
  Faction,
  FactionPressure,
  FactionRelation
} from '../../../shared/factions'
import { EditableField } from './EditableField'
import { FormattedText } from '../shared/FormattedText'

export function shouldShowFactionsSection(
  factionsSummary: string,
  factions: Faction[]
): boolean {
  return factionsSummary.trim().length > 0 || factions.length > 0
}

export function formatFactionRelationReadout(
  relation: FactionRelation,
  factionNamesById: Record<string, string>
): string {
  const a = factionNamesById[relation.factionAId] ?? relation.factionAId
  const b = factionNamesById[relation.factionBId] ?? relation.factionBId
  return `${a} ↔ ${b}: ${relation.stance}`
}

function deityNameForFaction(
  faction: Faction,
  deities: Deity[]
): string | null {
  if (!faction.deityId) {
    return null
  }
  return deities.find((deity) => deity.id === faction.deityId)?.name ?? null
}

function FactionPressureIndicator(props: { pressure: FactionPressure }): JSX.Element {
  return (
    <p className="campaign-review-faction-pressure">
      Pressure: <strong>{props.pressure}</strong>
    </p>
  )
}

function FactionRosterList(props: {
  factions: Faction[]
  deities: Deity[]
}): JSX.Element | null {
  if (props.factions.length === 0) {
    return null
  }
  const sorted = [...props.factions].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  )
  return (
    <ul className="campaign-review-faction-list">
      {sorted.map((faction) => {
        const deityName = deityNameForFaction(faction, props.deities)
        return (
          <li key={faction.id} className="campaign-review-faction-row">
            <span className="campaign-review-faction-name">{faction.name}</span>
            <span className="campaign-review-faction-kind">{faction.kind}</span>
            {deityName ? (
              <span className="campaign-review-faction-deity">deity: {deityName}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function FactionRelationsReadout(props: {
  factions: Faction[]
  relations: FactionRelation[]
}): JSX.Element | null {
  if (props.relations.length === 0) {
    return null
  }
  const factionNamesById = Object.fromEntries(
    props.factions.map((faction) => [faction.id, faction.name])
  )
  return (
    <div className="campaign-review-faction-relations">
      <strong>Relations</strong>
      <ul>
        {props.relations.map((relation) => (
          <li key={relation.id}>{formatFactionRelationReadout(relation, factionNamesById)}</li>
        ))}
      </ul>
    </div>
  )
}

export function CampaignReviewFactionsSection(props: {
  factionsSummary: string
  factionPressure: FactionPressure
  factions: Faction[]
  relations: FactionRelation[]
  deities: Deity[]
  onSaveSummary?: (factionsSummary: string) => Promise<void>
  readOnly?: boolean
}): JSX.Element | null {
  if (!shouldShowFactionsSection(props.factionsSummary, props.factions)) {
    return null
  }

  return (
    <section className="campaign-review-factions">
      <h2>Factions</h2>
      <FactionPressureIndicator pressure={props.factionPressure} />
      {props.readOnly || !props.onSaveSummary ? (
        <div className="campaign-review-readonly">
          <strong>Summary</strong>
          {props.factionsSummary
            ? FormattedText({
                as: 'p',
                className: 'campaign-review-readonly-value',
                text: props.factionsSummary
              })
            : <p>No factions summary yet.</p>}
        </div>
      ) : (
        <EditableField
          label="Summary"
          initialValue={props.factionsSummary}
          onSave={props.onSaveSummary}
        />
      )}
      <FactionRosterList factions={props.factions} deities={props.deities} />
      <FactionRelationsReadout factions={props.factions} relations={props.relations} />
    </section>
  )
}
