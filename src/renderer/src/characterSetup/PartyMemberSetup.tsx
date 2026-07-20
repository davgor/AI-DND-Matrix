import { useEffect, useMemo, useState } from 'react'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import type { RaceRosterGroup } from '../../../main/raceIpc'
import { buildRaceOptions, PartyMemberRow } from './PartyMemberRow'

export interface PartyMemberDraft {
  name: string
  characterClass: string
  personality: string
  raceKey: string
}

interface PartyMemberSetupProps {
  campaignId: string
  members: PartyMemberDraft[]
  onChange: (members: PartyMemberDraft[]) => void
}

/** Kept for re-enable; character setup UI currently hides party members. */
export function PartyMemberSetup(props: PartyMemberSetupProps): JSX.Element {
  const [roster, setRoster] = useState<RaceRosterGroup[]>([])
  const [campaignRaces, setCampaignRaces] = useState<CampaignRace[]>([])

  useEffect(() => {
    void window.race.getRoster().then(setRoster)
    void window.race.getCampaignRaces(props.campaignId).then(setCampaignRaces)
  }, [props.campaignId])

  const raceOptions = useMemo(() => buildRaceOptions(roster, campaignRaces), [roster, campaignRaces])

  function updateMember(index: number, patch: Partial<PartyMemberDraft>): void {
    props.onChange(props.members.map((member, i) => (i === index ? { ...member, ...patch } : member)))
  }

  return (
    <section className="party-member-setup">
      <h2>AI Party Members</h2>
      {props.members.map((member, index) => (
        <PartyMemberRow
          key={index}
          member={member}
          index={index}
          raceOptions={raceOptions}
          onUpdate={updateMember}
          onRemove={(rowIndex) => props.onChange(props.members.filter((_, i) => i !== rowIndex))}
        />
      ))}
    </section>
  )
}

export function validatePartyMembers(members: PartyMemberDraft[]): string | null {
  for (const member of members) {
    if (!member.name.trim()) {
      return 'Each party member needs a name.'
    }
    if (!member.characterClass.trim()) {
      return 'Each party member needs a class or role.'
    }
    if (!member.personality.trim()) {
      return 'Each party member needs a personality.'
    }
    if (!member.raceKey) {
      return 'Each party member needs a race.'
    }
  }
  return null
}
