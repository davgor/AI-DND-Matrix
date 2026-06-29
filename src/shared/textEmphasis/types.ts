export type EmphasisTokenType = 'text' | 'em' | 'strong'

export interface EmphasisToken {
  type: EmphasisTokenType
  content: string
}
