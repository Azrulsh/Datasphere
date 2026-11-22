import { useEffect, useState, useSyncExternalStore } from 'react'
import { createSessionController } from '../auth/sessionController'
import type { AppConfig } from '../config/appConfig'

export function useDataSphereSession(config: AppConfig) {
  const [controller] = useState(() => createSessionController(config))
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => {
    controller.start()
    return controller.stop
  }, [controller])
  return { snapshot, controller }
}
