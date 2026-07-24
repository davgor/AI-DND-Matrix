/** Default idle unload after last in-flight job (epic 152.1 / 152.5). */
export const DEFAULT_IMAGE_IDLE_UNLOAD_MS = 120_000

interface ImageIdleUnloadController {
  jobStarted(): void
  jobFinished(): void
  dispose(): void
  getInFlightCount(): number
}

export function createImageIdleUnloadController(
  onIdleUnload: () => void | Promise<void>,
  idleMs: number = DEFAULT_IMAGE_IDLE_UNLOAD_MS
): ImageIdleUnloadController {
  let inFlight = 0
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  function clearIdleTimer(): void {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function scheduleIdleUnload(): void {
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      if (inFlight === 0) {
        void onIdleUnload()
      }
    }, idleMs)
  }

  return {
    jobStarted() {
      inFlight += 1
      clearIdleTimer()
    },
    jobFinished() {
      inFlight = Math.max(0, inFlight - 1)
      if (inFlight === 0) {
        scheduleIdleUnload()
      }
    },
    dispose() {
      clearIdleTimer()
    },
    getInFlightCount() {
      return inFlight
    }
  }
}
