import { FormattedText } from '../shared/FormattedText'

export function EditableFieldReadView(props: { value: string }): JSX.Element {
  return FormattedText({ as: 'p', className: 'campaign-review-readonly-value', text: props.value })
}

export function EditableFieldEditView(props: {
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  return <textarea value={props.value} onChange={(event) => props.onChange(event.target.value)} />
}
