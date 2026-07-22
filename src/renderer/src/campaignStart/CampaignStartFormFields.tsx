import type { DeathMode } from '../../../shared/campaignCreate/types'
import {
  randomCampaignName,
  randomDeathMode,
  randomNpcsPerRegion,
  randomPremisePrompt,
  randomRegionCount
} from '../../../shared/campaignCreate/randomFill'
import {
  DEFAULT_NPCS_PER_REGION,
  DEFAULT_REGION_COUNT,
  MAX_NPCS_PER_REGION,
  MAX_REGION_COUNT,
  MIN_NPCS_PER_REGION,
  MIN_REGION_COUNT
} from '../../../shared/campaignCreate/types'
import { clampNpcsPerRegion, clampRegionCount } from '../../../shared/campaignCreate/validation'
import { FieldRandomDiceButton, FieldWithRandomInputRow } from '../components/FieldRandomDiceButton'
import { CampaignStartCountField, CampaignStartRespawnLocationField } from './CampaignStartRandomFields'
import type { CampaignStartFlow } from './useCampaignStartFlow'

const DEATH_MODES: DeathMode[] = ['legendary', 'standard', 'respawn']

const DEATH_MODE_LABELS: Record<DeathMode, string> = {
  legendary: 'Legendary',
  standard: 'Standard',
  respawn: 'Respawn'
}

const DEATH_MODE_HINTS: Record<DeathMode, string> = {
  legendary: 'Death is permanent — fail the dying-save sequence and the character is gone.',
  standard: 'Fatal blows rewind to the last save, as if the death never happened.',
  respawn: 'Wake at a chosen location for a gold cost; optional use limit, then death becomes permanent.'
}

function CampaignStartIdentityFields(props: { flow: CampaignStartFlow }): JSX.Element {
  const { flow } = props
  const disabled = flow.submitting

  return (
    <>
      <label className="campaign-start-field">
        Campaign name <span className="campaign-start-optional">(optional)</span>
        <FieldWithRandomInputRow
          ariaLabel="Random campaign name"
          disabled={disabled}
          centerAlign
          onRandomize={() => flow.updateForm({ name: randomCampaignName() })}
        >
          <input
            type="text"
            value={flow.form.name}
            disabled={disabled}
            onChange={(event) => flow.updateForm({ name: event.target.value })}
          />
        </FieldWithRandomInputRow>
      </label>
      <label className="campaign-start-field">
        Premise
        <FieldWithRandomInputRow
          ariaLabel="Random campaign premise"
          disabled={disabled}
          onRandomize={() => flow.updateForm({ premisePrompt: randomPremisePrompt() })}
        >
          <textarea
            value={flow.form.premisePrompt}
            disabled={disabled}
            rows={4}
            onChange={(event) => flow.updateForm({ premisePrompt: event.target.value })}
          />
        </FieldWithRandomInputRow>
      </label>
      {flow.fieldError ? <p className="campaign-start-field-error">{flow.fieldError}</p> : null}
    </>
  )
}

function CampaignStartGenerationFields(props: { flow: CampaignStartFlow }): JSX.Element {
  const { flow } = props
  const disabled = flow.submitting

  return (
    <>
      <CampaignStartCountField
        label="Regions to generate"
        hint={`How many starting regions to create (${MIN_REGION_COUNT}–${MAX_REGION_COUNT}, default ${DEFAULT_REGION_COUNT}). You can add more on the review screen.`}
        ariaLabel="Random region count"
        value={flow.form.regionCount}
        min={MIN_REGION_COUNT}
        max={MAX_REGION_COUNT}
        disabled={disabled}
        onRandomize={() => flow.updateForm({ regionCount: randomRegionCount() })}
        onChange={(value) => flow.updateForm({ regionCount: clampRegionCount(value) })}
      />
      <CampaignStartCountField
        label="NPCs per region"
        hint={`NPCs generated in each starting region (${MIN_NPCS_PER_REGION}–${MAX_NPCS_PER_REGION}, default ${DEFAULT_NPCS_PER_REGION}). Zero is allowed, but review requires at least one region and one NPC before you can continue.`}
        ariaLabel="Random NPCs per region"
        value={flow.form.npcsPerRegion}
        min={MIN_NPCS_PER_REGION}
        max={MAX_NPCS_PER_REGION}
        disabled={disabled}
        onRandomize={() => flow.updateForm({ npcsPerRegion: randomNpcsPerRegion() })}
        onChange={(value) => flow.updateForm({ npcsPerRegion: clampNpcsPerRegion(value) })}
      />
    </>
  )
}

function CampaignStartDeathModeHints(): JSX.Element {
  return (
    <div className="campaign-start-death-mode-hints" aria-hidden="true">
      {DEATH_MODES.map((mode) => (
        <p key={mode}>
          <span className="campaign-start-death-mode-hint-label">{DEATH_MODE_LABELS[mode]}</span>
          {' — '}
          {DEATH_MODE_HINTS[mode]}
        </p>
      ))}
    </div>
  )
}

function CampaignStartDeathModeFields(props: { flow: CampaignStartFlow }): JSX.Element {
  const { flow } = props
  const disabled = flow.submitting

  return (
    <>
      <div className="campaign-start-death-mode-row">
        <fieldset className="campaign-start-fieldset" disabled={disabled}>
          <legend className="field-with-random-legend">
            <span>Death mode</span>
            <FieldRandomDiceButton
              ariaLabel="Random death mode"
              disabled={disabled}
              onRandomize={() => flow.updateForm({ deathMode: randomDeathMode() })}
            />
          </legend>
          {DEATH_MODES.map((mode) => (
            <label key={mode} className="campaign-start-radio">
              <input
                type="radio"
                name="deathMode"
                checked={flow.form.deathMode === mode}
                onChange={() => flow.updateForm({ deathMode: mode })}
              />
              {DEATH_MODE_LABELS[mode]}
            </label>
          ))}
        </fieldset>
        <CampaignStartDeathModeHints />
      </div>
      {flow.form.deathMode === 'respawn' ? (
        <CampaignStartRespawnLocationField flow={flow} disabled={disabled} />
      ) : null}
    </>
  )
}

function CampaignStartGenerativeTokensFields(props: { flow: CampaignStartFlow }): JSX.Element {
  const { flow } = props
  const disabled = flow.submitting
  return (
    <label className="campaign-start-checkbox-field">
      <input
        type="checkbox"
        checked={flow.form.generativeTokensEnabled}
        disabled={disabled}
        onChange={(event) => flow.updateForm({ generativeTokensEnabled: event.target.checked })}
      />
      <span>
        Use generative tokens?
        <span className="campaign-start-field-hint">
          Off by default. When on, speaking NPCs, AI companions, and combat creatures get async
          portraits for Social / dossiers / roster (never blocks play). Local image models stay
          optional.
        </span>
      </span>
    </label>
  )
}

export function CampaignStartFormFields(props: {
  flow: CampaignStartFlow
  isError: boolean
}): JSX.Element {
  const { flow, isError } = props
  return (
    <>
      <h2 id="campaign-start-title">{isError ? 'Campaign creation failed' : 'New campaign'}</h2>
      {isError && flow.flowError ? <p className="campaign-start-flow-error">{flow.flowError}</p> : null}
      <CampaignStartIdentityFields flow={flow} />
      <CampaignStartGenerationFields flow={flow} />
      <CampaignStartDeathModeFields flow={flow} />
      <CampaignStartGenerativeTokensFields flow={flow} />
    </>
  )
}

export function CampaignStartFormActions(props: {
  flow: CampaignStartFlow
  isError: boolean
  onSubmit: () => void
}): JSX.Element {
  const { flow, isError, onSubmit } = props
  return (
    <div className="campaign-start-actions">
      <button type="button" disabled={flow.submitting} onClick={() => flow.close()}>
        Cancel
      </button>
      {isError ? (
        <button type="button" disabled={flow.submitting} onClick={onSubmit}>
          Retry
        </button>
      ) : null}
      {isError ? (
        <button type="button" disabled={flow.submitting} onClick={() => flow.backToForm()}>
          Edit form
        </button>
      ) : (
        <button type="button" disabled={flow.submitting} onClick={onSubmit}>
          Create campaign
        </button>
      )}
    </div>
  )
}
