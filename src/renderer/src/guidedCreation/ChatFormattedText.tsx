import { formatChatMessageTokens } from '../../../shared/textEmphasis'
import type { EmphasisToken } from '../../../shared/textEmphasis'

export interface ChatFormattedTextProps {
  text: string
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

export function ChatFormattedText(props: ChatFormattedTextProps): JSX.Element {
  const tokens = formatChatMessageTokens(props.text)
  return <div className="guided-conversation-message-body">{tokens.map(renderToken)}</div>
}
