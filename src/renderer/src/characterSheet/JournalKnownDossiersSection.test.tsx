import { describe, expect, it, vi } from 'vitest'
import { JournalKnownDossiersSection } from './JournalKnownDossiersSection'
import { buttonEntries, collectText, flattenJsx } from '../playView/askDmTestUtils'
import type { JournalKnownDossier } from '../../../shared/journal/types'

const dossiers: JournalKnownDossier[] = [
  { npcId: 'npc-mira', name: 'Mira' },
  { npcId: 'npc-ada', name: 'Ada' }
]

describe('JournalKnownDossiersSection', () => {
  it('renders known dossier names', () => {
    const tree = flattenJsx(JournalKnownDossiersSection({ dossiers }))
    const text = collectText(tree)
    expect(text).toContain('Mira')
    expect(text).toContain('Ada')
    expect(text).toContain('Known dossiers')
  })

  it('shows empty state when none generated', () => {
    const tree = JournalKnownDossiersSection({ dossiers: [] })
    expect(collectText(tree)).toContain('No dossiers generated yet')
  })

  it('opens dossier with npcId when a row is chosen', () => {
    const onOpenNpcDossier = vi.fn()
    const tree = JournalKnownDossiersSection({ dossiers, onOpenNpcDossier })
    const mira = buttonEntries(tree).find((button) => button.label === 'Mira')
    expect(mira).toBeDefined()
    mira?.onClick?.()
    expect(onOpenNpcDossier).toHaveBeenCalledWith('npc-mira')
  })
})
