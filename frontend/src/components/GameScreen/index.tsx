import Header from './Header'
import NarrativePanel from './NarrativePanel'
import EventGraph from './EventGraph'
import DossierNotes from './DossierNotes'
import CommandBar from './CommandBar'

export default function GameScreen() {
  return (
    <div className="bg-background text-on-background font-body h-screen w-screen overflow-hidden fade-in">

      <Header />

      {/* Main canvas — pt-14 for header, pb-[220px] for CommandBar */}
      <main
        className="pt-14 h-screen overflow-hidden grid"
        style={{
          gridTemplateColumns: '7fr 5fr',
          paddingBottom: 'calc(28vh + 100px)',
        }}
      >
        {/* Left: Narrative Archive */}
        <NarrativePanel />

        {/* Right: Event Graph + Dossier Notes */}
        <div className="flex flex-col h-full overflow-hidden border-l border-on-background/8">
          <EventGraph />
          <div className="flex-1 flex items-start justify-center overflow-hidden min-h-0"
               style={{ padding: '8px 16px 0' }}>
            <DossierNotes />
          </div>
        </div>
      </main>

      <CommandBar />
    </div>
  )
}
