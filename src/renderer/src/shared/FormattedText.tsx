import { matchPersonNames } from '../../../shared/journal'
import type { PersonMatchCandidate } from '../../../shared/journal'
import { tokenizeTextEmphasis } from '../../../shared/textEmphasis'
import type { EmphasisToken } from '../../../shared/textEmphasis'
import './formattedText.css'

export interface FormattedTextProps {
  text: string
  as?: keyof JSX.IntrinsicElements
  className?: string
  personCandidates?: PersonMatchCandidate[]
  onPersonActivate?: (npcId: string) => void
}

type ContentChild = JSX.Element | string

function personButton(
  name: string,
  npcId: string,
  key: string,
  onActivate: (npcId: string) => void
): JSX.Element {
  return (
    <button
      key={key}
      type="button"
      className="formatted-text-person-link"
      aria-label={`Open dossier for ${name}`}
      onClick={() => onActivate(npcId)}
    >
      {name}
    </button>
  )
}

function splitByPersonSpans(
  content: string,
  candidates: PersonMatchCandidate[],
  onActivate: (npcId: string) => void,
  keyPrefix: string
): ContentChild[] {
  const spans = matchPersonNames(content, candidates)
  if (spans.length === 0) {
    return [content]
  }

  const parts: ContentChild[] = []
  let cursor = 0
  for (const span of spans) {
    if (span.start > cursor) {
      parts.push(content.slice(cursor, span.start))
    }
    const name = content.slice(span.start, span.end)
    parts.push(personButton(name, span.npcId, `${keyPrefix}-${span.start}`, onActivate))
    cursor = span.end
  }
  if (cursor < content.length) {
    parts.push(content.slice(cursor))
  }
  return parts
}

function contentChildren(
  content: string,
  candidates: PersonMatchCandidate[] | undefined,
  onActivate: ((npcId: string) => void) | undefined,
  keyPrefix: string
): ContentChild[] {
  if (!onActivate || candidates === undefined || candidates.length === 0) {
    return [content]
  }
  return splitByPersonSpans(content, candidates, onActivate, keyPrefix)
}

function unwrapChildren(children: ContentChild[]): ContentChild | ContentChild[] {
  return children.length === 1 ? children[0]! : children
}

function tokenParts(
  token: EmphasisToken,
  index: number,
  candidates: PersonMatchCandidate[] | undefined,
  onActivate: ((npcId: string) => void) | undefined
): ContentChild[] {
  const inner = unwrapChildren(contentChildren(token.content, candidates, onActivate, String(index)))
  if (token.type === 'text') {
    return Array.isArray(inner) ? inner : [inner]
  }
  if (token.type === 'em') {
    return [<em key={index}>{inner}</em>]
  }
  return [<strong key={index}>{inner}</strong>]
}

export function FormattedText(props: FormattedTextProps): JSX.Element {
  const Tag = props.as ?? 'span'
  const tokens = tokenizeTextEmphasis(props.text ?? '')
  const children = tokens.flatMap((token, index) =>
    tokenParts(token, index, props.personCandidates, props.onPersonActivate)
  )
  return <Tag className={props.className}>{children}</Tag>
}
