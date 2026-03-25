import Header from './Header'
import Sidebar from './Sidebar'
import NarrativePanel from './NarrativePanel'
import EventGraph from './EventGraph'
import DialoguePanel from './DialoguePanel'
import CompileLog from './CompileLog'
import CommandBar from './CommandBar'

export default function GameScreen() {
  return (
    <div className="bg-background text-on-surface font-body cursor-crosshair overflow-hidden h-screen w-screen fade-in">

      {/* CRT overlay */}
      <div className="crt-overlay" />

      {/* Decorative glitch lines */}
      <div className="fixed top-1/4 left-0 w-full h-px bg-white/5 pointer-events-none z-[60] animate-flicker" />
      <div
        className="fixed top-2/3 left-0 w-full h-px bg-white/5 pointer-events-none z-[60]"
        style={{ animation: 'flicker 5s infinite' }}
      />

      <Header />
      <Sidebar />

      {/* Main canvas — mirrors the original ml-64 pt-12 pb-16 grid */}
      <main
        className="ml-64 pt-12 pb-16 h-screen overflow-hidden grid gap-px"
        style={{
          gridTemplateColumns: '5fr 7fr',
          background: 'rgba(71,71,71,0.1)',
        }}
      >
        {/* Left: Narrative Archive */}
        <NarrativePanel />

        {/* Right: Node Graph + bottom split */}
        <div className="flex flex-col h-full overflow-hidden">
          <EventGraph />
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <DialoguePanel />
            <CompileLog />
          </div>
        </div>
      </main>

      <CommandBar />
    </div>
  )
}
