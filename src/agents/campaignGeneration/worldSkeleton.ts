/** Engine-owned world JSON skeleton for campaign create (161.4). */

export function buildWorldSkeletonJson(): string {
  return JSON.stringify({
    worldName: '{{WORLD_NAME}}',
    worldSummary: '{{WORLD_SUMMARY}}',
    worldHistory: '{{WORLD_HISTORY}}'
  })
}
