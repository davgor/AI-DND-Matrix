import type { DeathMode } from '../../../shared/campaignCreate/types'
import {
  DEFAULT_NPCS_PER_REGION,
  DEFAULT_REGION_COUNT,
  MAX_NPCS_PER_REGION,
  MAX_REGION_COUNT,
  MIN_NPCS_PER_REGION,
  MIN_REGION_COUNT
} from '../../../shared/campaignCreate/types'
import { clampNpcsPerRegion, clampRegionCount } from '../../../shared/campaignCreate/validation'
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
  return (
    <>
      <label className="campaign-start-field">
        Campaign name <span className="campaign-start-optional">(optional)</span>
        <input
          type="text"
          value={flow.form.name}
          disabled={flow.submitting}
          onChange={(event) => flow.updateForm({ name: event.target.value })}
        />
      </label>
      <label className="campaign-start-field">
        Premise
        <textarea
          value={flow.form.premisePrompt}
          disabled={flow.submitting}
          rows={4}
          onChange={(event) => flow.updateForm({ premisePrompt: event.target.value })}
        />
      </label>
      {flow.fieldError ? <p className="campaign-start-field-error">{flow.fieldError}</p> : null}
    </>
  )
}

function CampaignStartGenerationFields(props: { flow: CampaignStartFlow }): JSX.Element {
  const { flow } = props
  return (
    <>
      <label className="campaign-start-field">
        Regions to generate
        <input
          type="number"
          min={MIN_REGION_COUNT}
          max={MAX_REGION_COUNT}
          value={flow.form.regionCount}
          disabled={flow.submitting}
          onChange={(event) =>
            flow.updateForm({ regionCount: clampRegionCount(Number(event.target.value)) })
          }
        />
        <span className="campaign-start-hint">
          How many starting regions to create ({MIN_REGION_COUNT}–{MAX_REGION_COUNT}, default{' '}
          {DEFAULT_REGION_COUNT}). You can add more on the review screen.
        </span>
      </label>
      <label className="campaign-start-field">
        NPCs per region
        <input
          type="number"
          min={MIN_NPCS_PER_REGION}
          max={MAX_NPCS_PER_REGION}
          value={flow.form.npcsPerRegion}
          disabled={flow.submitting}
          onChange={(event) =>
            flow.updateForm({ npcsPerRegion: clampNpcsPerRegion(Number(event.target.value)) })
          }
        />
        <span className="campaign-start-hint">
          NPCs generated in each starting region ({MIN_NPCS_PER_REGION}–{MAX_NPCS_PER_REGION},
          default {DEFAULT_NPCS_PER_REGION}). Zero is allowed, but review requires at least one
          region and one NPC before you can continue.
        </span>
      </label>
    </>
  )
}

function CampaignStartDeathModeFields(props: { flow: CampaignStartFlow }): JSX.Element {
  const { flow } = props
  return (
    <>
      <div className="campaign-start-death-mode-row">
        <fieldset className="campaign-start-fieldset" disabled={flow.submitting}>
          <legend>Death mode</legend>
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
        <div className="campaign-start-death-mode-hints" aria-hidden="true">
          {DEATH_MODES.map((mode) => (
            <p key={mode}>
              <span className="campaign-start-death-mode-hint-label">{DEATH_MODE_LABELS[mode]}</span>
              {' — '}
              {DEATH_MODE_HINTS[mode]}
            </p>
          ))}
        </div>
      </div>
      {flow.form.deathMode === 'respawn' ? (
        <label className="campaign-start-field">
          Respawn location
          <input
            type="text"
            value={flow.form.respawnLocation}
            disabled={flow.submitting}
            onChange={(event) => flow.updateForm({ respawnLocation: event.target.value })}
          />
        </label>
      ) : null}
    </>
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
