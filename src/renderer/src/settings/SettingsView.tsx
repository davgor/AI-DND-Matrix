import { CheckForUpdatesButton } from '../autoUpdate/CheckForUpdatesButton'
import { useAppUpdate } from '../autoUpdate/UpdateBanner'
import { ApiKeySection } from './ApiKeySection'
import { CloudProviderSection, type CloudProviderKind } from './CloudProviderSection'
import { LlamaLocalSection } from './LlamaLocalSection'
import { Player2Section } from './Player2Section'
import { ProviderModeSelector } from './ProviderModeSelector'
import { providerSectionKind } from './providerSectionKind'
import { RagEmbedderSection } from './RagEmbedderSection'
import { useSettings, type SettingsController } from './useSettings'
import { LlmUsageSection } from './LlmUsageSection'
import { useLlmUsageSettings } from './useLlmUsageSettings'
import './settings.css'

interface SettingsViewProps {
  onClose: () => void
}

function cloudDraftFields(
  controller: SettingsController,
  kind: CloudProviderKind
): { apiKey: string; apiKeySet: boolean; model: string } {
  if (kind === 'openai') {
    return {
      apiKey: controller.draft.openaiApiKey,
      apiKeySet: controller.openaiApiKeySet,
      model: controller.draft.openaiModel
    }
  }
  if (kind === 'gemini') {
    return {
      apiKey: controller.draft.geminiApiKey,
      apiKeySet: controller.geminiApiKeySet,
      model: controller.draft.geminiModel
    }
  }
  return {
    apiKey: controller.draft.grokApiKey,
    apiKeySet: controller.grokApiKeySet,
    model: controller.draft.grokModel
  }
}

function applyCloudPatch(
  controller: SettingsController,
  kind: CloudProviderKind,
  patch: { apiKey?: string; model?: string }
): void {
  if (kind === 'openai') {
    controller.updateDraft({ openaiApiKey: patch.apiKey, openaiModel: patch.model })
    return
  }
  if (kind === 'gemini') {
    controller.updateDraft({ geminiApiKey: patch.apiKey, geminiModel: patch.model })
    return
  }
  controller.updateDraft({ grokApiKey: patch.apiKey, grokModel: patch.model })
}

function CloudSection(props: {
  controller: SettingsController
  kind: CloudProviderKind
}): JSX.Element {
  const fields = cloudDraftFields(props.controller, props.kind)
  return (
    <CloudProviderSection
      kind={props.kind}
      apiKey={fields.apiKey}
      apiKeySet={fields.apiKeySet}
      model={fields.model}
      errors={props.controller.errors}
      connectionResult={props.controller.cloudConnectionResult}
      onChange={(patch) => applyCloudPatch(props.controller, props.kind, patch)}
      onTestConnection={props.controller.testCloud}
    />
  )
}

function ProviderSection(props: { controller: SettingsController }): JSX.Element {
  const { controller } = props
  const kind = providerSectionKind(controller.draft.mode)

  if (kind === 'claude') {
    return (
      <ApiKeySection
        claudeApiKey={controller.draft.claudeApiKey}
        claudeApiKeySet={controller.claudeApiKeySet}
        claudeModel={controller.draft.claudeModel}
        errors={controller.errors}
        connectionResult={controller.cloudConnectionResult}
        onChange={controller.updateDraft}
        onTestConnection={controller.testCloud}
      />
    )
  }
  if (kind === 'openai' || kind === 'gemini' || kind === 'grok') {
    return <CloudSection controller={controller} kind={kind} />
  }
  if (kind === 'llamacpp') {
    return (
      <LlamaLocalSection
        draft={controller.draft}
        errors={controller.errors}
        result={controller.llamaRuntimeResult}
        downloadProgressText={controller.llamaDownloadProgressText}
        downloadProgressPercent={controller.llamaDownloadProgressPercent}
        onChange={controller.updateDraft}
        onCheckRuntime={controller.checkLlamaRuntime}
        onDownloadModel={controller.downloadLlamaModel}
        onCancelDownload={controller.cancelLlamaDownload}
        onAcquireRuntime={controller.acquireLlamaRuntime}
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

function canSave(controller: SettingsController): boolean {
  if (!controller.dirty || controller.saving || !controller.draftValid) {
    return false
  }
  if (controller.draft.mode === 'llamacpp') {
    const catalogReady =
      controller.draft.llamaCppCatalogModelId.trim() !== '' &&
      controller.draft.llamaCppDownloadState === 'ready'
    const hasServer = controller.draft.llamaCppServerPath.trim() !== ''
    return controller.llamaRuntimeChecked || (catalogReady && hasServer)
  }
  return true
}

function SettingsPanelBody(props: {
  controller: SettingsController
  llmUsage: ReturnType<typeof useLlmUsageSettings>
  currentVersion: string
}): JSX.Element {
  const { controller, llmUsage, currentVersion } = props
  return (
    <>
      {controller.confirmingDiscard && (
        <DiscardConfirmation onConfirm={controller.confirmDiscard} onCancel={controller.cancelDiscard} />
      )}
      <ProviderModeSelector mode={controller.draft.mode} onChange={(mode) => controller.updateDraft({ mode })} />
      <ProviderSection controller={controller} />
      <RagEmbedderSection
        draft={controller.draft}
        openaiApiKeySet={controller.openaiApiKeySet}
        geminiApiKeySet={controller.geminiApiKeySet}
        downloadProgressText={controller.ragDownloadProgressText}
        onChange={controller.updateDraft}
        onDownloadModel={controller.downloadRagModel}
      />
      <LlmUsageSection controller={llmUsage} />
      {controller.saveFailed && <p className="settings-field-error">Could not save settings. Please try again.</p>}
      <footer className="settings-footer">
        <div className="settings-version-row">
          <p className="settings-version" aria-label={`Application version ${currentVersion}`}>
            Version {currentVersion}
          </p>
          <CheckForUpdatesButton />
        </div>
        <div className="settings-footer-actions">
          <button type="button" onClick={controller.requestClose}>
            Cancel
          </button>
          <button type="button" disabled={!canSave(controller)} onClick={() => void controller.save()}>
            {controller.saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        {controller.draft.mode === 'llamacpp' && !controller.llamaRuntimeChecked && controller.dirty && (
          <p className="settings-field-error">Run a successful runtime check before saving.</p>
        )}
      </footer>
    </>
  )
}

export function SettingsView(props: SettingsViewProps): JSX.Element {
  const controller = useSettings(props.onClose)
  const llmUsage = useLlmUsageSettings()
  const { currentVersion } = useAppUpdate()

  return (
    <div className="settings-overlay" role="dialog" aria-label="Settings">
      <div className="settings-panel">
        <header className="settings-header">
          <h2>Settings</h2>
          <button type="button" className="btn-ghost settings-close" aria-label="Close settings" onClick={controller.requestClose}>
            &#10005;
          </button>
        </header>
        <SettingsPanelBody
          controller={controller}
          llmUsage={llmUsage}
          currentVersion={currentVersion}
        />
      </div>
    </div>
  )
}
