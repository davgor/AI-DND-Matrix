export function CharacterSheetRaceLine(props: { raceLabel: string | null }): JSX.Element | null {
  if (!props.raceLabel) {
    return null
  }
  return <p className="character-sheet-race">{props.raceLabel}</p>
}
