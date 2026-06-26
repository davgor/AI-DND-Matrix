export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4)
}
