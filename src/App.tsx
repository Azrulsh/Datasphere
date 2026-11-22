import { AppLayout } from './components/layout/AppLayout'
import { VisualizationScene } from './components/visualization/VisualizationScene'
import { sampleRecords } from './data/sampleRecords'

export default function App() {
  return <AppLayout recordCount={sampleRecords.length}><VisualizationScene records={sampleRecords} /></AppLayout>
}
