import { useEffect, useState } from 'react'
import Header from './Header'
import NarrativePanel from './NarrativePanel'
import EventGraphContainer from '../EventGraphContainer'
import DossierNotes from './DossierNotes'
import PatchCommandBar from '../PatchCommandBar'
import PageTurnOverlay from '../PageTurnOverlay'
import { useGameStore } from '../../store/gameStore'

type FocusedPanel = 'graph' | 'notes' | null

export default function GameScreen() {
  const storyId = useGameStore((s) => s.gameState?.story_id)
  const isComplete = useGameStore((s) => !!s.gameState?.is_complete)
  const markChapterCompleted = useGameStore((s) => s.markChapterCompleted)

  useEffect(() => {
    if (isComplete && storyId) markChapterCompleted(storyId)
  }, [isComplete, storyId, markChapterCompleted])

  // Which right-pane panel should float on top right now. Click-to-focus:
  // clicking a panel raises it; the other drops to its default z-index.
  const [focusedPanel, setFocusedPanel] = useState<FocusedPanel>(null)
  const graphFocused = focusedPanel === 'graph'
  const notesFocused = focusedPanel === 'notes'

  return (
    <div className="bg-background text-on-background font-body h-screen w-screen overflow-hidden fade-in">

      {/* Global SVG filter defs — referenced by sketch selection boxes */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="g-sketch-sel" x="-10%" y="-15%" width="120%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <Header />

      {/* Main canvas — pt-14 for header, pb for PatchCommandBar */}
      <main
        className="pt-14 h-screen overflow-hidden grid"
        style={{
          gridTemplateColumns: '7fr 5fr',
          paddingBottom: '72px',
        }}
      >
        {/* Left: Narrative Archive */}
        <NarrativePanel />

        {/* Right: full-bleed graph canvas with a floating sticky note */}
        <div className="relative w-full h-full overflow-hidden border-l border-on-background/8">

          {/* Event node graph — centered card pinned to the desk.
              The inset-0 wrapper is pointer-events:none so clicks on the
              empty desk area don't get swallowed — especially important
              when this panel is focused (z-40) and otherwise would block
              clicks landing on the Dossier Notes widget underneath it.
              A pointer-events:auto shim around the actual card captures
              the "click to focus" gesture. */}
          <div
            className={`focus-panel absolute inset-0 flex items-center justify-center p-10 pointer-events-none
                        ${graphFocused ? 'is-focused z-40' : notesFocused ? 'is-receded z-10' : 'z-10'}`}
          >
            <div
              onMouseDown={() => setFocusedPanel('graph')}
              className="pointer-events-auto"
            >
              <EventGraphContainer />
            </div>
          </div>

          {/* Dossier Notes — sticky-note widget pinned to the bottom-right of the desk */}
          <div
            onMouseDown={() => setFocusedPanel('notes')}
            className={`focus-panel absolute bottom-10 right-8 w-72 h-72
                        ${notesFocused ? 'is-focused z-40' : graphFocused ? 'is-receded z-20' : 'z-20'}`}
          >
            <DossierNotes />
          </div>
        </div>
      </main>

      <PatchCommandBar />

      <PageTurnOverlay />
    </div>
  )
}
