import type { GenerateContext, MockProviderCall, Provider } from './types'

export type ScriptedResponse = string | Error

export interface ScriptedMockProvider extends Provider {
  calls: MockProviderCall[]
}

export function createScriptedProvider(responses: ScriptedResponse[]): ScriptedMockProvider {
  const calls: MockProviderCall[] = []
  const queue = [...responses]

  return {
    calls,
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      calls.push({ prompt, context })
      const next = queue.shift()
      if (next === undefined) {
        throw new Error('createScriptedProvider: no more scripted responses queued')
      }
      if (next instanceof Error) {
        throw next
      }
      return next
    }
  }
}
