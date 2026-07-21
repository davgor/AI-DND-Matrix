import { tokenizeTextEmphasis } from '../../../shared/textEmphasis'
import type { EmphasisToken } from '../../../shared/textEmphasis'

export interface FormattedTextProps {
  text: string
  as?: keyof JSX.IntrinsicElements
  className?: string
}

function renderToken(token: EmphasisToken, index: number): JSX.Element | string {
  if (token.type === 'text') {
    return token.content
  }
  if (token.type === 'em') {
    return <em key={index}>{token.content}</em>
  }
  return <strong key={index}>{token.content}</strong>
}

export function FormattedText(props: FormattedTextProps): JSX.Element {
  const Tag = props.as ?? 'span'
  const tokens = tokenizeTextEmphasis(props.text ?? '')
  return <Tag className={props.className}>{tokens.map(renderToken)}</Tag>
}
