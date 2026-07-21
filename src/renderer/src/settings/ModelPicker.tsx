import {
  CUSTOM_MODEL_OPTION_VALUE,
  MODEL_CATALOGS,
  resolveModelSelection,
  type CloudProviderId
} from '../../../shared/settings/modelCatalogs'

interface ModelPickerProps {
  provider: CloudProviderId
  modelId: string
  onChange: (modelId: string) => void
  error?: string
  idPrefix?: string
}

export function ModelPicker(props: ModelPickerProps): JSX.Element {
  const prefix = props.idPrefix ?? `settings-${props.provider}`
  const resolved = resolveModelSelection(props.provider, props.modelId)
  const isCustom = resolved.selection === CUSTOM_MODEL_OPTION_VALUE
  const selectId = `${prefix}-model`
  const customId = `${prefix}-model-custom`

  function handleSelectChange(value: string): void {
    if (value === CUSTOM_MODEL_OPTION_VALUE) {
      props.onChange(resolved.customId)
      return
    }
    props.onChange(value)
  }

  return (
    <div className="settings-model-picker">
      <label htmlFor={selectId}>Model</label>
      <select
        id={selectId}
        aria-label="Model"
        value={resolved.selection}
        onChange={(event) => handleSelectChange(event.target.value)}
      >
        {[
          ...MODEL_CATALOGS[props.provider].map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          )),
          <option key={CUSTOM_MODEL_OPTION_VALUE} value={CUSTOM_MODEL_OPTION_VALUE}>
            Custom…
          </option>
        ]}
      </select>
      {isCustom && (
        <>
          <label htmlFor={customId}>Custom model id</label>
          <input
            id={customId}
            type="text"
            aria-label="Custom model id"
            value={resolved.customId}
            onChange={(event) => props.onChange(event.target.value)}
          />
        </>
      )}
      {props.error && <p className="settings-field-error">{props.error}</p>}
    </div>
  )
}
