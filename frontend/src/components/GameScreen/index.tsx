import { useEffect } from 'react'
import Header from './Header'
import NarrativePanel from './NarrativePanel'
import EventGraphContainer from '../EventGraphContainer'
import DossierNotes from './DossierNotes'
import PatchCommandBar from '../PatchCommandBar'
import PageTurnOverlay from '../PageTurnOverlay'
import { useGameStore } from '../../store/gameStore'

export default function GameScreen() {
  const storyId = useGameStore((s) => s.gameState?.story_id)
  const isComplete = useGameStore((s) => !!s.gameState?.is_complete)
  const markChapterCompleted = useGameStore((s) => s.markChapterCompleted)

  useEffect(() => {
    if (isComplete && storyId) markChapterCompleted(storyId)
  }, [isComplete, storyId, markChapterCompleted])

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

          {/* Event node graph — centered card pinned to the desk */}
          <div className="absolute inset-0 flex items-center justify-center p-10">
            <EventGraphContainer />
          </div>

          {/* Dossier Notes — sticky-note widget pinned to the bottom-right of the desk */}
          <div className="absolute bottom-10 right-8 w-72 h-72 z-20">
            <DossierNotes />
          </div>
        </div>
      </main>

      <PatchCommandBar />

      <PageTurnOverlay />
    </div>
  )
}
