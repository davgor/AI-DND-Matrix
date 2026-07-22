/** Pure helpers for sidebar export/import actions (testable without React). */

export function failureMessageForTest(result: {
  ok: false
  message?: string
  canceled?: true
}): string | null {
  if ('canceled' in result && result.canceled) return null
  return result.message ?? 'Campaign action failed.'
}

export async function runExportAction(
  exportFn: (campaignId: string) => Promise<{ ok: true } | { ok: false; message?: string; canceled?: true }>,
  _refresh: () => Promise<void>,
  campaignId: string
): Promise<{ error: string | null }> {
  const result = await exportFn(campaignId)
  if (!result.ok) {
    return { error: failureMessageForTest(result) }
  }
  return { error: null }
}

export async function runImportAction(
  importFn: () => Promise<{ ok: true } | { ok: false; message?: string; canceled?: true }>,
  refresh: () => Promise<void>
): Promise<{ error: string | null }> {
  const result = await importFn()
  if (!result.ok) {
    return { error: failureMessageForTest(result) }
  }
  await refresh()
  return { error: null }
}
