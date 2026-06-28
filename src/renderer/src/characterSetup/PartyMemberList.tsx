import { useState } from 'react'
import type { AiPartyMemberInput } from '../../../main/characterCreationIpc'

export interface PartyMemberListProps {
  onChange: (members: AiPartyMemberInput[]) => void
}

const EMPTY_MEMBER: AiPartyMemberInput = { name: '', characterClass: '', personality: '' }

export function PartyMemberList(props: PartyMemberListProps): JSX.Element {
  const [members, setMembers] = useState<AiPartyMemberInput[]>([])

  function update(index: number, field: keyof AiPartyMemberInput, value: string): void {
    const next = members.map((member, i) => (i === index ? { ...member, [field]: value } : member))
    setMembers(next)
    props.onChange(next)
  }

  function addMember(): void {
    const next = [...members, { ...EMPTY_MEMBER }]
    setMembers(next)
    props.onChange(next)
  }

  function removeMember(index: number): void {
    const next = members.filter((_, i) => i !== index)
    setMembers(next)
    props.onChange(next)
  }

  return (
    <div className="party-member-list">
      {members.map((member, index) => (
        <div key={index} className="party-member-row">
          <input
            placeholder="Name"
            value={member.name}
            onChange={(event) => update(index, 'name', event.target.value)}
          />
          <input
            placeholder="Class"
            value={member.characterClass}
            onChange={(event) => update(index, 'characterClass', event.target.value)}
          />
          <input
            placeholder="Personality"
            value={member.personality}
            onChange={(event) => update(index, 'personality', event.target.value)}
          />
          <button type="button" onClick={() => removeMember(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addMember}>
        Add Party Member
      </button>
    </div>
  )
}
