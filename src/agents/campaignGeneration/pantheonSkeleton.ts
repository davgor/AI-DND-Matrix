/** Engine-owned pantheon JSON skeleton for campaign create (161.4). */

export const PANTHEON_SKELETON_DEITY_COUNT = 10
const FORGOTTEN_TAIL_COUNT = 2

export function buildPantheonSkeletonJson(): string {
  const deities = []
  for (let index = 0; index < PANTHEON_SKELETON_DEITY_COUNT; index += 1) {
    const forgotten = index >= PANTHEON_SKELETON_DEITY_COUNT - FORGOTTEN_TAIL_COUNT
    deities.push({
      name: `{{DEITY_${index}_NAME}}`,
      epithet: `{{DEITY_${index}_EPITHET}}`,
      domains: `{{DEITY_${index}_DOMAINS}}`,
      tenets: `{{DEITY_${index}_TENETS}}`,
      blurb: `{{DEITY_${index}_BLURB}}`,
      isForgotten: forgotten
    })
  }
  return JSON.stringify({
    pantheonSummary: '{{PANTHEON_SUMMARY}}',
    deities
  })
}
