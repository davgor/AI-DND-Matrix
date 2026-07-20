import type { LlmUsageRecentTotals } from '../../../shared/llmUsage'
import type { LlmUsageController } from './useLlmUsageSettings'

const BUCKET_LABELS: Record<string, string> = {
  setup: 'Setup',
  play: 'Play',
  meta: 'Meta'
}

function formatTokenCount(value: number | null): string {
  if (value === null) {
    return 'unknown'
  }
  return value.toLocaleString()
}

function rangeLabel(range: 'last_7_days' | 'all_time'): string {
  return range === 'last_7_days' ? 'Last 7 days' : 'All time'
}

function UsageTotalsTable(props: {
  totals: LlmUsageRecentTotals
  formatCost: LlmUsageController['formatCost']
}): JSX.Element {
  const setupRow = props.totals.summary.byBucket.find((row) => row.bucket === 'setup')
  const playRow = props.totals.summary.byBucket.find((row) => row.bucket === 'play')
  const rows = [setupRow, playRow].filter((row): row is NonNullable<typeof setupRow> => row !== undefined)

  return (
    <div className="settings-usage-totals">
      <p className="settings-help-text">{rangeLabel(props.totals.range)}</p>
      <table className="settings-usage-table">
        <thead>
          <tr>
            <th scope="col">Bucket</th>
            <th scope="col">Calls</th>
            <th scope="col">Tokens</th>
            <th scope="col">Est. cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.bucket}>
              <td>{BUCKET_LABELS[row.bucket] ?? row.bucket}</td>
              <td>{row.eventCount}</td>
              <td>{formatTokenCount(row.totalTokens)}</td>
              <td>{props.formatCost(row.estimatedCostUsd)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4}>No recorded LLM usage yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function LlmUsageSection(props: { controller: LlmUsageController }): JSX.Element {
  const { controller } = props

  return (
    <section className="settings-section settings-usage-section" aria-label="LLM usage">
      <h3>LLM usage</h3>
      <p className="settings-help-text">
        Save a usage log file to send to the developer. Contains token totals only — no API keys or chat text.
      </p>
      {controller.loading && <p className="settings-help-text">Loading usage totals…</p>}
      {!controller.loading && controller.totals && (
        <UsageTotalsTable totals={controller.totals} formatCost={controller.formatCost} />
      )}
      <button type="button" className="settings-usage-export" onClick={() => void controller.exportLog()}>
        Export usage log
      </button>
      {controller.exportPath && (
        <p className="settings-check-ok">Saved to {controller.exportPath}</p>
      )}
      {controller.exportError && <p className="settings-field-error">{controller.exportError}</p>}
    </section>
  )
}
