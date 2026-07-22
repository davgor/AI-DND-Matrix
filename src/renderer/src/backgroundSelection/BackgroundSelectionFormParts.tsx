export function BackgroundDescriptionField(props: {
  description: string
}): JSX.Element {
  return (
    <textarea
      className="background-selection-description"
      value={props.description}
      readOnly
      aria-readonly="true"
      rows={4}
    />
  )
}

export function BackgroundCustomLabelField(props: {
  label: string
  disabled: boolean
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <div className="background-selection-custom-label-row">
      <label className="background-selection-field-label" htmlFor="background-custom-label">
        Custom label
      </label>
      <input
        id="background-custom-label"
        className="background-selection-custom-label"
        type="text"
        value={props.label}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="e.g. River Smuggler"
        required
      />
    </div>
  )
}

export function BackgroundStoryField(props: {
  story: string
  disabled: boolean
  onChange: (value: string) => void
  onGenerateClick: () => void
  generateDisabled: boolean
}): JSX.Element {
  return (
    <div className="background-selection-story-row">
      <label className="background-selection-story-label" htmlFor="background-story">
        Your story
      </label>
      <button
        type="button"
        className="background-selection-generate"
        disabled={props.generateDisabled}
        onClick={props.onGenerateClick}
      >
        Generate
      </button>
      <textarea
        id="background-story"
        className="background-selection-story"
        value={props.story}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        rows={8}
      />
    </div>
  )
}
