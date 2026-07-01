export function PlaySessionChromeQuestButton(props: {
  mainQuestTitle: string | null
  onOpenQuestLog?: () => void
}): JSX.Element {
  const label = props.mainQuestTitle
    ? `Quests: ${props.mainQuestTitle.length > 24 ? `${props.mainQuestTitle.slice(0, 24)}…` : props.mainQuestTitle}`
    : 'Quests'
  return (
    <button type="button" className="play-session-chrome-quest-chip" title={props.mainQuestTitle ?? undefined} onClick={props.onOpenQuestLog}>
      {label}
    </button>
  )
}
