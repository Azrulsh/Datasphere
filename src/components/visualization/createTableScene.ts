import { MathUtils, PerspectiveCamera, Scene } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'
import { COLUMN_SPACING, ROW_SPACING, TABLE_COLUMNS, TILE_HEIGHT, TILE_WIDTH, tablePosition } from '../../layouts/tableLayout'

/** The renderer owns its DOM subtree; React owns card contents through portals. */
export function createTableScene(host: HTMLDivElement, elements: HTMLDivElement[]) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(45, 1, 1, 50_000)
  const renderer = new CSS3DRenderer()
  host.appendChild(renderer.domElement)
  const objects = elements.map((element, index) => {
    const object = new CSS3DObject(element)
    const { x, y, z } = tablePosition(index, elements.length)
    object.position.set(x, y, z)
    scene.add(object)
    return object
  })
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false // Render on demand: no permanent animation loop.
  controls.minDistance = 250
  controls.maxDistance = 30_000
  controls.screenSpacePanning = true
  controls.listenToKeyEvents(host)
  const render = () => renderer.render(scene, camera)
  controls.addEventListener('change', render)

  const reset = (overview = false) => {
    const columns = Math.min(TABLE_COLUMNS, elements.length)
    const rows = Math.ceil(elements.length / TABLE_COLUMNS)
    const halfFov = MathUtils.degToRad(camera.fov / 2)
    const visibleColumns = Math.max(1, Math.min(columns, 5, Math.floor(host.clientWidth / TILE_WIDTH)))
    const width = overview ? (columns - 1) * COLUMN_SPACING + TILE_WIDTH : visibleColumns * COLUMN_SPACING
    const height = overview ? (rows - 1) * ROW_SPACING + TILE_HEIGHT : Math.min(rows, 2) * ROW_SPACING
    const distance = Math.max(height / 2 / Math.tan(halfFov), width / 2 / (Math.tan(halfFov) * camera.aspect)) * 1.12
    controls.target.set(0, 0, 0)
    camera.position.set(0, 0, MathUtils.clamp(distance, controls.minDistance, controls.maxDistance))
    camera.up.set(0, 1, 0)
    controls.update()
    render()
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
    reset: () => reset(),
    fitAll: () => reset(true),
    zoom: (factor: number) => {
      const offset = camera.position.clone().sub(controls.target)
      offset.setLength(MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance))
      camera.position.copy(controls.target).add(offset)
      controls.update()
      render()
    },
    dispose: () => {
      observer.disconnect()
      controls.removeEventListener('change', render)
      controls.dispose()
      objects.forEach((object) => scene.remove(object))
      renderer.domElement.remove()
    },
  }
}
