import { MathUtils, Object3D, PerspectiveCamera, Scene, Sphere, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'
import { createLayoutTargets } from '../../layouts/layoutTargets'
import { COLUMN_SPACING, ROW_SPACING, TABLE_COLUMNS, TILE_HEIGHT, TILE_WIDTH } from '../../layouts/tableLayout'
import type { LayoutName } from '../../types/layout'
import { createLayoutTransition } from './layoutTransition'

/** One scene and set of card objects survive every arrangement change. */
export function createVisualizationScene(host: HTMLDivElement, elements: HTMLDivElement[]) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(45, 1, 1, 50_000)
  const renderer = new CSS3DRenderer()
  host.appendChild(renderer.domElement)
  let layout: LayoutName = 'table'
  const targetCache = new Map<LayoutName, Object3D[]>()
  const boundsCache = new Map<LayoutName, Sphere>()

  const getTargets = (name: LayoutName) => {
    const cached = targetCache.get(name)
    if (cached) return cached
    const targets = createLayoutTargets(name, elements.length).map(({ position, normal }) => {
      const target = new Object3D()
      target.position.set(position.x, position.y, position.z)
      target.lookAt(position.x + normal.x, position.y + normal.y, position.z + normal.z)
      return target
    })
    targetCache.set(name, targets)
    return targets
  }

  const getBounds = () => {
    const cached = boundsCache.get(layout)
    if (cached) return cached
    const corners: Vector3[] = []
    // Include rotated card corners, not just card centers, when framing a layout.
    getTargets(layout).forEach((target) => {
      for (const x of [-TILE_WIDTH / 2, TILE_WIDTH / 2]) {
        for (const y of [-TILE_HEIGHT / 2, TILE_HEIGHT / 2]) {
          corners.push(new Vector3(x, y, 0).applyQuaternion(target.quaternion).add(target.position))
        }
      }
    })
    const bounds = corners.length > 0
      ? new Sphere().setFromPoints(corners)
      : new Sphere(new Vector3(), Math.hypot(TILE_WIDTH, TILE_HEIGHT) / 2)
    boundsCache.set(layout, bounds)
    return bounds
  }

  const objects = elements.map((element, index) => {
    element.style.backfaceVisibility = 'hidden'
    const object = new CSS3DObject(element)
    object.position.copy(getTargets('table')[index].position)
    scene.add(object)
    return object
  })
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false
  controls.minDistance = 250
  controls.maxDistance = 30_000
  controls.screenSpacePanning = true
  controls.listenToKeyEvents(host)
  const render = () => renderer.render(scene, camera)
  controls.addEventListener('change', render)
  const transition = createLayoutTransition(objects, render)
  let animateCamera = false
  const stopCameraAnimation = () => { animateCamera = false }
  // User navigation takes over the camera without interrupting the card animation.
  controls.addEventListener('start', stopCameraAnimation)
  const onKeyDown = (event: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) stopCameraAnimation()
  }
  host.addEventListener('keydown', onKeyDown, true)

  const cameraFrame = (overview: boolean) => {
    const halfFov = MathUtils.degToRad(camera.fov / 2)
    if (layout === 'table' && !overview) {
      const columns = Math.min(TABLE_COLUMNS, elements.length)
      const rows = Math.ceil(elements.length / TABLE_COLUMNS)
      const visibleColumns = Math.max(1, Math.min(columns, 5, Math.floor(host.clientWidth / TILE_WIDTH)))
      const width = visibleColumns * COLUMN_SPACING
      const height = Math.max(1, Math.min(rows, 2)) * ROW_SPACING
      const distance = Math.max(height / 2 / Math.tan(halfFov), width / 2 / (Math.tan(halfFov) * camera.aspect)) * 1.12
      return { target: new Vector3(), position: new Vector3(0, 0, distance) }
    }
    const sphere = getBounds()
    const limitingFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect))
    const distance = Math.max(controls.minDistance, sphere.radius / Math.sin(limitingFov) * 1.1)
    // An oblique Grid view reveals its depth layers instead of stacking them visually.
    const direction = layout === 'grid' ? new Vector3(1, 0.45, 2).normalize() : new Vector3(0, 0, 1)
    controls.maxDistance = Math.max(30_000, distance * 2)
    camera.far = Math.max(50_000, distance * 4)
    camera.updateProjectionMatrix()
    return { target: sphere.center.clone(), position: direction.multiplyScalar(distance).add(sphere.center) }
  }

  const reset = (overview = false) => {
    animateCamera = false
    const frame = cameraFrame(overview)
    controls.target.copy(frame.target)
    camera.position.copy(frame.position)
    camera.up.set(0, 1, 0)
    // OrbitControls renders through its change listener when the pose changes.
    if (!controls.update()) render()
  }

  let initialized = false
  const resize = () => {
    const { width, height } = host.getBoundingClientRect()
    if (width <= 0 || height <= 0) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    if (!initialized) { initialized = true; reset() }
    else render()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  return {
    setLayout: (name: LayoutName) => {
      if (name === layout) return
      layout = name
      const fromPosition = camera.position.clone()
      const fromTarget = controls.target.clone()
      const frame = cameraFrame(false)
      animateCamera = true
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900
      transition.start(getTargets(name), duration, (progress) => {
        if (!animateCamera) return
        camera.position.lerpVectors(fromPosition, frame.position, progress)
        controls.target.lerpVectors(fromTarget, frame.target, progress)
        // No damping: controls derive their orbit from this pose on the next input.
        camera.lookAt(controls.target)
      })
    },
    reset: () => reset(),
    fitAll: () => reset(true),
    zoom: (factor: number) => {
      animateCamera = false
      const offset = camera.position.clone().sub(controls.target)
      offset.setLength(MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance))
      camera.position.copy(controls.target).add(offset)
      if (!controls.update()) render()
    },
    dispose: () => {
      transition.dispose()
      observer.disconnect()
      controls.removeEventListener('change', render)
      controls.removeEventListener('start', stopCameraAnimation)
      host.removeEventListener('keydown', onKeyDown, true)
      controls.dispose()
      objects.forEach((object) => scene.remove(object))
      targetCache.clear()
      boundsCache.clear()
      renderer.domElement.remove()
    },
  }
}
