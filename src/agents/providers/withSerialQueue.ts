import type { GenerateContext, Provider } from './types'

function createSerialChain(): {
  enqueue: <T>(task: () => Promise<T>) => Promise<T>
  reset: () => void
} {
  let chain: Promise<unknown> = Promise.resolve()
  return {
    enqueue<T>(task: () => Promise<T>): Promise<T> {
      const run = chain.then(task)
      chain = run.then(
        () => undefined,
        () => undefined
      )
      return run
    },
    reset(): void {
      chain = Promise.resolve()
    }
  }
}

/** Process-wide gate so separately built llamacpp provider stacks cannot race. */
const sharedLlamaChain = createSerialChain()

/**
 * Ensures overlapping `generate()` calls run one at a time.
 * Used for local llama.cpp, which often returns HTTP 500 under concurrent load.
 */
export function withSharedSerialQueue(provider: Provider): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      return sharedLlamaChain.enqueue(() => provider.generate(prompt, context))
    }
  }
}

/** Test-only: clear the shared queue between cases. */
export function resetSharedSerialQueueForTests(): void {
  sharedLlamaChain.reset()
}
