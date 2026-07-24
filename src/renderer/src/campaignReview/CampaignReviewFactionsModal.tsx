import type { Deity } from '../../../db/repositories/deities'
import type {
  Faction,
  FactionPressure,
  FactionRelation
} from '../../../shared/factions'
import { FormattedText } from '../shared/FormattedText'

export function formatFactionRelationReadout(
  relation: FactionRelation,
  factionNamesById: Record<string, string>
): string {
  const a = factionNamesById[relation.factionAId] ?? relation.factionAId
  const b = factionNamesById[relation.factionBId] ?? relation.factionBId
  return `${a} ↔ ${b}: ${relation.stance}`
}

function deityNameForFaction(faction: Faction, deities: Deity[]): string | null {
  if (!faction.deityId) {
    return null
  }
  return deities.find((deity) => deity.id === faction.deityId)?.name ?? null
}

function DetailBlock(props: { label: string; text: string }): JSX.Element {
  return (
    <div className="campaign-review-faction-detail-block">
      <strong>{props.label}</strong>
      {FormattedText({
        as: 'p',
        className: 'campaign-review-faction-detail-text',
        text: props.text
      })}
    </div>
  )
}

function FactionDetailCard(props: {
  faction: Faction
  deities: Deity[]
}): JSX.Element {
  const { faction } = props
  const deityName = deityNameForFaction(faction, props.deities)
  return (
    <article className="campaign-review-faction-card">
      <header className="campaign-review-faction-card-header">
        <h3>{faction.name}</h3>
        <span className="campaign-review-faction-kind">{faction.kind}</span>
        {deityName ? (
          <span className="campaign-review-faction-deity">deity: {deityName}</span>
        ) : null}
      </header>
      {faction.summary.trim() ? <DetailBlock label="Summary" text={faction.summary} /> : null}
      {faction.motivation?.trim() ? (
        <DetailBlock label="Motivation" text={faction.motivation} />
      ) : null}
      {faction.publicFace?.trim() ? (
        <DetailBlock label="Public face" text={faction.publicFace} />
      ) : null}
      {faction.methods?.trim() ? <DetailBlock label="Methods" text={faction.methods} /> : null}
    </article>
  )
}

function FactionRelationsDetail(props: {
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
          <li key={relation.id}>
            <div>{formatFactionRelationReadout(relation, factionNamesById)}</div>
            {relation.summary?.trim() ? (
              <p className="campaign-review-faction-relation-summary">{relation.summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CampaignReviewFactionsModal(props: {
  factionPressure: FactionPressure
  factions: Faction[]
  relations: FactionRelation[]
  deities: Deity[]
  onClose: () => void
}): JSX.Element {
  const sorted = [...props.factions].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  )
  return (
    <div className="campaign-review-overlay campaign-review-overlay--content-width">
      <div
        className="campaign-review-generate-modal campaign-review-factions-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-review-factions-title"
      >
        <h2 id="campaign-review-factions-title">Factions</h2>
        <p>
          Pressure: <strong>{props.factionPressure}</strong>. Powers, guilds, and rivalries shaping
          this world.
        </p>
        <div className="campaign-review-factions-body">
          {sorted.map((faction) => (
            <FactionDetailCard key={faction.id} faction={faction} deities={props.deities} />
          ))}
          <FactionRelationsDetail factions={props.factions} relations={props.relations} />
        </div>
        <div className="campaign-review-modal-actions">
          <button type="button" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
