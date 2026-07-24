import { GenerateModalOverlay } from './GenerateModalOverlay'
import { GenerateModalShell } from './GenerateModalShell'
import { useGenerateSeedSubmit } from './useGenerateSeedSubmit'

export function CampaignReviewGenerateBestiaryModal(props: {
  campaignId: string
  onDetailChange: (detail: import('../../../main/campaignIpc').CampaignDetail) => void
  onClose: () => void
}): JSX.Element {
  const generate = useGenerateSeedSubmit({
    emptyMessage: 'Describe the creature you want to add.',
    onDetailChange: props.onDetailChange,
    onClose: props.onClose,
    runGenerate: (trimmed) =>
      window.campaigns.generateBestiarySpecies({
        campaignId: props.campaignId,
        seedPrompt: trimmed
      })
  })

  return (
    <GenerateModalOverlay generating={generate.generating} onClose={props.onClose}>
      <GenerateModalShell
        titleId="generate-bestiary-title"
        title="Add creature"
        description="Describe a customized monster. Lore and appearance are generated for this campaign’s bestiary."
        generating={generate.generating}
        generateError={generate.generateError}
        submitDisabled={!generate.seedPrompt.trim()}
        submitLabel="Generate creature"
        generatingLabel="Generating..."
        onClose={props.onClose}
        onSubmit={() => void generate.submit()}
      >
        <textarea
          className="campaign-review-seed-input"
          value={generate.seedPrompt}
          onChange={(event) => generate.setSeedPrompt(event.target.value)}
          placeholder="e.g. Coral Titan — a wagon-sized reef crab that ambushes coastal roads at low tide..."
          rows={5}
          disabled={generate.generating}
        />
      </GenerateModalShell>
    </GenerateModalOverlay>
  )
}
