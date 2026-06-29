import { useState } from 'react'
import type { Npc } from '../../../db/repositories/npcs'
import type { EditNpcTraitsInput } from '../../../main/campaignEditIpc'
import type { Alignment, Temperament } from '../../../shared/alignment/types'
import { NpcTraitFields } from './NpcTraitFields'

export function CampaignReviewNpcTraits(props: {
  campaignId: string
  npc: Npc
  onSaveTraits: (input: EditNpcTraitsInput) => Promise<void>
}): JSX.Element {
  const { npc } = props
  const [temperament, setTemperament] = useState<Temperament>(npc.temperament)
  const [alignment, setAlignment] = useState<Alignment | ''>(npc.alignment ?? '')
  const [canSpeak, setCanSpeak] = useState(npc.canSpeak)
  const [saving, setSaving] = useState(false)

  const dirty =
    temperament !== npc.temperament ||
    (alignment || null) !== npc.alignment ||
    canSpeak !== npc.canSpeak

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await props.onSaveTraits({
        campaignId: props.campaignId,
        npcId: npc.id,
        temperament,
        alignment: alignment || null,
        canSpeak
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="campaign-review-npc-traits">
      <NpcTraitFields
        temperament={temperament}
        alignment={alignment}
        canSpeak={canSpeak}
        onTemperamentChange={setTemperament}
        onAlignmentChange={setAlignment}
        onCanSpeakChange={setCanSpeak}
      />
      <button type="button" disabled={saving || !dirty} onClick={() => void handleSave()}>
        {saving ? 'Saving...' : 'Save traits'}
      </button>
    </div>
  )
}
