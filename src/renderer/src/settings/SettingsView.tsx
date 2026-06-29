import { ApiKeySection } from './ApiKeySection'
import { LlamaLocalSection } from './LlamaLocalSection'
import { Player2Section } from './Player2Section'
import { ProviderModeSelector } from './ProviderModeSelector'
import { useSettings } from './useSettings'
import './settings.css'

export interface SettingsViewProps {
  onClose: () => void
}

function ProviderSection(props: { controller: ReturnType<typeof useSettings> }): JSX.Element {
  const { controller } = props
  if (controller.draft.mode === 'claude') {
    return (
      <ApiKeySection
        claudeApiKey={controller.draft.claudeApiKey}
        claudeApiKeySet={controller.claudeApiKeySet}
        claudeModel={controller.draft.claudeModel}
        errors={controller.errors}
        onChange={controller.updateDraft}
      />
    )
  }
  if (controller.draft.mode === 'llamacpp') {
    return (
      <LlamaLocalSection
        draft={controller.draft}
        errors={controller.errors}
        result={controller.llamaRuntimeResult}
        onChange={controller.updateDraft}
        onCheckRuntime={controller.checkLlamaRuntime}
      />
    )
  }
  return (
    <Player2Section
      player2BaseUrl={controller.draft.player2BaseUrl}
      errors={controller.errors}
      result={controller.playerConnectionResult}
      onChange={(player2BaseUrl) => controller.updateDraft({ player2BaseUrl })}
      onTestConnection={controller.testPlayer2}
    />
  )
}

function DiscardConfirmation(props: { onConfirm: () => void; onCancel: () => void }): JSX.Element {
  return (
    <div className="settings-discard-confirm" role="alertdialog" aria-label="Unsaved changes">
      <p>You have unsaved changes.</p>
      <button type="button" onClick={props.onCancel}>
        Keep editing
      </button>
      <button type="button" onClick={props.onConfirm}>
        Discard changes
      </button>
    </div>
  )
}

export function SettingsView(props: SettingsViewProps): JSX.Element {
  const controller = useSettings(props.onClose)

  return (
    <div className="settings-overlay" role="dialog" aria-label="Settings">
      <div className="settings-panel">
        <header className="settings-header">
          <h2>Settings</h2>
          <button type="button" aria-label="Close settings" onClick={controller.requestClose}>
            &#10005;
          </button>
        </header>
        {controller.confirmingDiscard && (
          <DiscardConfirmation onConfirm={controller.confirmDiscard} onCancel={controller.cancelDiscard} />
        )}
        <ProviderModeSelector mode={controller.draft.mode} onChange={(mode) => controller.updateDraft({ mode })} />
        <ProviderSection controller={controller} />
        {controller.saveFailed && <p className="settings-field-error">Could not save settings. Please try again.</p>}
        <footer className="settings-footer">
          <button type="button" onClick={controller.requestClose}>
            Cancel
          </button>
          <button type="button" disabled={!controller.dirty || controller.saving} onClick={() => void controller.save()}>
            {controller.saving ? 'Saving...' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  )
}
