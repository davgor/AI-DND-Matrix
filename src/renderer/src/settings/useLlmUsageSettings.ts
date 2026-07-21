import { useCallback, useEffect, useState } from 'react'
import type { LlmUsageExportResult, LlmUsageRecentTotals } from '../../../shared/llmUsage'
import { formatEstimatedCostUsd } from '../../../shared/llmUsage'

export interface LlmUsageController {
  totals: LlmUsageRecentTotals | null
  loading: boolean
  exportError: string | null
  exportPath: string | null
  exportLog: () => Promise<void>
  formatCost: (value: number | 'unknown') => string
}

export function useLlmUsageSettings(): LlmUsageController {
  const [totals, setTotals] = useState<LlmUsageRecentTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportPath, setExportPath] = useState<string | null>(null)

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true)
      try {
        setTotals(await window.llmUsage.getRecentTotals())
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const exportLog = useCallback(async () => {
    setExportError(null)
    setExportPath(null)
    const result: LlmUsageExportResult = await window.llmUsage.exportLog()
    if (result.ok) {
      setExportPath(result.path)
      return
    }
    if ('canceled' in result && result.canceled) {
      return
    }
    setExportError('error' in result ? result.error : 'Could not export usage log.')
  }, [])

  return {
    totals,
    loading,
    exportError,
    exportPath,
    exportLog,
    formatCost: formatEstimatedCostUsd
  }
}
