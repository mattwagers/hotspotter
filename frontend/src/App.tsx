import Toolbar from './components/Toolbar'
import SurprisalRibbon from './components/SurprisalRibbon'
import TranscriptView from './components/TranscriptView'
import HotspotTable from './components/HotspotTable'

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      <Toolbar />
      <SurprisalRibbon />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <TranscriptView />
      </main>
      <HotspotTable />
    </div>
  )
}
