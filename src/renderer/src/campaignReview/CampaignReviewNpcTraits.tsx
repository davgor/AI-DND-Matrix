import type { Npc } from '../../../db/repositories/npcs'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'
import { resolveBackgroundDisplayLabel } from '../../../shared/characterBackground/resolveLabel'
import { findGenderRosterEntry } from '../../../shared/npcGender/types'
import { findNpcClassRosterEntry } from '../../../shared/npcClass/types'
import { resolveRaceDisplayLabel } from '../../../shared/raceSelection/resolveLabel'
import type { CampaignRace } from '../../../shared/raceSelection/types'

import { CampaignReviewPanel } from './CampaignReviewPanel'

function formatTemperament(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function traitRow(label: string, value: string): JSX.Element {
  return (
    <div className="campaign-review-npc-trait-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function optionalTraitRow(label: string, value: string | null | undefined): JSX.Element | null {
  return value ? traitRow(label, value) : null
}

function speakingIdentityRows(npc: Npc, campaignRaces: CampaignRace[]): Array<JSX.Element | null> {
  return [
    optionalTraitRow('Race', resolveRaceDisplayLabel(npc.raceKey, campaignRaces)),
    optionalTraitRow(
      'Alignment',
      npc.alignment ? ALIGNMENT_LABELS[npc.alignment as Alignment] : null
    ),
    optionalTraitRow(
      'Gender',
      npc.genderKey ? findGenderRosterEntry(npc.genderKey)?.label : null
    ),
    optionalTraitRow(
      'Class',
      npc.classKey ? findNpcClassRosterEntry(npc.classKey)?.label : null
    ),
    optionalTraitRow('Background', resolveBackgroundDisplayLabel(npc.backgroundKey)),
    optionalTraitRow('Hair', npc.hairColor),
    optionalTraitRow('Age', npc.age),
    optionalTraitRow('Eyes', npc.eyeColor)
  ]
}

function buildTraitRows(npc: Npc, campaignRaces: CampaignRace[]): JSX.Element[] {
  const rows: Array<JSX.Element | null> = [
    traitRow('Temperament', formatTemperament(npc.temperament)),
    ...speakingIdentityRows(npc, campaignRaces),
    npc.canSpeak ? null : traitRow('Speech', 'Non-verbal (deaf or mute)')
  ]
  return rows.filter((row): row is JSX.Element => row !== null)
}

export function CampaignReviewNpcTraits(props: {
  npc: Npc
  campaignRaces?: CampaignRace[]
}): JSX.Element {
  return (
    <CampaignReviewPanel legend="Traits">
      <dl className="campaign-review-npc-traits">
        {buildTraitRows(props.npc, props.campaignRaces ?? [])}
      </dl>
    </CampaignReviewPanel>
  )
}
