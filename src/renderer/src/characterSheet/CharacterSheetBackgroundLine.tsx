export function CharacterSheetBackgroundLine(props: { backgroundLabel: string | null }): JSX.Element | null {
  if (!props.backgroundLabel) {
    return null
  }
  return <p className="character-sheet-background">{props.backgroundLabel}</p>
}
