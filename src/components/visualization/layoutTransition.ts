import type { Object3D } from 'three'

interface FrameScheduler {
  request: (callback: FrameRequestCallback) => number
  cancel: (id: number) => void
  now: () => number
}

const browserFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
  now: () => performance.now(),
}

/** Only one active frame chain; restarting captures the current interpolated pose. */
export function createLayoutTransition(
  objects: readonly Object3D[],
  render: () => void,
  frames: FrameScheduler = browserFrames,
) {
  let frame: number | null = null
  let disposed = false
  const cancel = () => {
    if (frame !== null) frames.cancel(frame)
    frame = null
  }

  return {
    start(targets: readonly Object3D[], duration: number, onProgress: (progress: number) => void = () => {}) {
      cancel()
      if (disposed) return
      if (targets.length !== objects.length) throw new Error('Each object requires one layout target')
      const from = objects.map((object) => ({ position: object.position.clone(), quaternion: object.quaternion.clone() }))
      const startTime = frames.now()
      const tick = (time: number) => {
        frame = null
        if (disposed) return
        const progress = duration <= 0 ? 1 : Math.min(1, Math.max(0, (time - startTime) / duration))
        const eased = progress * progress * (3 - 2 * progress)
        objects.forEach((object, index) => {
          object.position.lerpVectors(from[index].position, targets[index].position, eased)
          object.quaternion.slerpQuaternions(from[index].quaternion, targets[index].quaternion, eased)
        })
        onProgress(eased)
        render()
        if (progress < 1) frame = frames.request(tick)
      }
      if (duration <= 0) tick(startTime)
      else frame = frames.request(tick)
    },
    dispose() { disposed = true; cancel() },
  }
}
