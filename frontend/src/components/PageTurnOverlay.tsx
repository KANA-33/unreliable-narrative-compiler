import { useGameStore } from '../store/gameStore'

export default function PageTurnOverlay() {
  const isPageTurning = useGameStore((s) => s.isPageTurning)
  if (!isPageTurning) return null

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-auto flex items-stretch justify-stretch"
      aria-hidden="true"
      role="presentation"
    >
      {/* Dimming backdrop — fades in with the flip */}
      <div className="absolute inset-0 bg-black/35 fade-in" />

      {/* The flipping sheet — textured like the desk so it reads as a page */}
      <div className="page-flip-sheet absolute inset-0 cardboard-bg">
        {/* center crease for the folded-page illusion */}
        <div className="page-flip-crease" />

        {/* subtle "Next Chapter" marking at the center of the cover */}
        <div className="absolute inset-0 flex items-center justify-center select-none">
          <div
            className="font-headline italic text-on-background/35 text-2xl tracking-widest
                       border-y border-on-background/20 px-6 py-2"
            style={{ transform: 'rotate(-1.2deg)' }}
          >
            — turning page —
          </div>
        </div>
      </div>
    </div>
  )
}
