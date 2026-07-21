import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'
import { resolveBackgroundDisplayLabel } from '../../../shared/characterBackground/resolveLabel'
import { findGenderRosterEntry } from '../../../shared/npcGender/types'
import { findNpcClassRosterEntry } from '../../../shared/npcClass/types'
import { resolveRaceDisplayLabel } from '../../../shared/raceSelection/resolveLabel'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import type { NpcDossierTraits } from '../../../shared/npcDossier/types'
import { NPC_DOSSIER_EMPTY_PLACEHOLDER, formatDossierTemperament } from './npcDossierCopy'

function traitRow(label: string, value: string): JSX.Element {
  return (
    <div className="npc-dossier-trait-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function optionalTraitLabel(
  label: string,
  value: string | null | undefined,
  resolve: (key: string) => string | null
): JSX.Element {
  const display = value ? resolve(value) ?? NPC_DOSSIER_EMPTY_PLACEHOLDER : NPC_DOSSIER_EMPTY_PLACEHOLDER
  return traitRow(label, display)
}

function identityRows(traits: NpcDossierTraits, campaignRaces: CampaignRace[]): JSX.Element[] {
  return [
    optionalTraitLabel('Race', traits.raceKey, (key) => resolveRaceDisplayLabel(key, campaignRaces)),
    optionalTraitLabel(
      'Alignment',
      traits.alignment,
      (key) => ALIGNMENT_LABELS[key as Alignment] ?? NPC_DOSSIER_EMPTY_PLACEHOLDER
    ),
    optionalTraitLabel('Gender', traits.genderKey, (key) => findGenderRosterEntry(key)?.label ?? null),
    optionalTraitLabel('Class', traits.classKey, (key) => findNpcClassRosterEntry(key)?.label ?? null),
    optionalTraitLabel(
      'Background',
      traits.backgroundKey,
      (key) => resolveBackgroundDisplayLabel(key) ?? NPC_DOSSIER_EMPTY_PLACEHOLDER
    )
  ]
}

export function NpcDossierTraitsSection(props: {
  traits: NpcDossierTraits
  canSpeak: boolean
  campaignRaces?: CampaignRace[]
}): JSX.Element {
  const rows: JSX.Element[] = [
    traitRow('Temperament', formatDossierTemperament(props.traits.temperament)),
    ...identityRows(props.traits, props.campaignRaces ?? []),
    traitRow('Role', props.traits.role)
  ]
  if (!props.canSpeak) {
    rows.push(traitRow('Speech', 'Non-verbal (deaf or mute)'))
  }
  return (
    <section className="npc-dossier-section">
      <h3>Traits</h3>
      <dl className="npc-dossier-traits">{rows}</dl>
    </section>
  )
}
