import { useGameStore } from '../store/gameStore'
import type { StoryMeta } from '../types'

/**
 * Renders a single book "page" representing a chapter — chapter number badge,
 * title, and one-line description. Used by PageTurnOverlay to fill the left
 * and right halves of the open-spread backdrop with the actual outgoing /
 * incoming chapter content (so the player sees the chapters on either side
 * during the flip rather than a blank cardboard texture).
 *
 * The styling intentionally echoes the dossier-folder aesthetic of the rest
 * of the game (annotated headline, dashed dividers, file-ref tab) so the
 * transition reads as part of the same world.
 */
/**
 * Chapter "page" shown on each half of the spread. Deliberately minimal —
 * only "CH NN" + the chapter title — so the page reads as a clean chapter
 * heading rather than competing with the in-game UI.
 */
function ChapterPage({ story, side }: { story: StoryMeta | undefined; side: 'left' | 'right' }) {
  if (!story) {
    return <div className="absolute inset-0 chapter-page-blank" />
  }
  const ch = String(story.chapter).padStart(2, '0')
  const tilt = side === 'left' ? '-rotate-[0.5deg]' : 'rotate-[0.5deg]'
  return (
    <div className="chapter-page absolute inset-0 flex items-center justify-center">
      <div className={`${tilt} flex flex-col items-center text-center px-8`}>
        <span className="font-label text-xs uppercase tracking-[0.4em] text-on-background/60">
          CH {ch}
        </span>
        <h2 className="mt-4 font-headline italic text-4xl md:text-5xl leading-tight text-on-background ink-bleed">
          {story.title}
        </h2>
      </div>
    </div>
  )
}

export default function PageTurnOverlay() {
  const isPageTurning = useGameStore((s) => s.isPageTurning)
  const direction = useGameStore((s) => s.pageTurnDirection)
  const fromId = useGameStore((s) => s.pageTurnFromStoryId)
  const toId = useGameStore((s) => s.pageTurnToStoryId)
  const stories = useGameStore((s) => s.stories)
  if (!isPageTurning) return null

  const fromStory = stories.find((s) => s.id === fromId)
  const toStory = stories.find((s) => s.id === toId)

  // Spread layout. Forward turn (next chapter) keeps the natural Western
  // book orientation: where you came from on the left, where you're going on
  // the right. Backward turn (prev chapter) mirrors it so the destination
  // always ends up on the side you're "moving toward".
  const isForward = direction === 'forward'
  const leftStory = isForward ? fromStory : toStory
  const rightStory = isForward ? toStory : fromStory

  return (
    <div
      className="page-flip-root fixed inset-0 z-[100] pointer-events-auto overflow-hidden"
      aria-hidden="true"
      role="presentation"
    >
      {/* Open-book backdrop — cardboard desk + two real chapter pages either
          side of the spine. Fades in at start and out at end so the leading
          and trailing handoffs to the underlying game UI are soft. */}
      <div className="page-flip-backdrop absolute inset-0">
        <div className="absolute inset-0 cardboard-bg" />
        <div className="absolute inset-y-0 left-0 right-1/2 page-half page-half--left">
          <ChapterPage story={leftStory} side="left" />
        </div>
        <div className="absolute inset-y-0 left-1/2 right-0 page-half page-half--right">
          <ChapterPage story={rightStory} side="right" />
        </div>
        <div className="page-spine" />
      </div>

      {/* The flipping leaf — half-width, hinged on the spine. Same paper-page
          look as the spread halves so it reads as one of the book's pages
          being lifted, not a separate cardboard placeholder. Faces stay blank
          (no chapter text) — the chapter content lives in the backdrop. */}
      <div
        className={`page-flip-stage absolute inset-0 ${
          isForward ? 'is-forward' : 'is-backward'
        }`}
      >
        <div className="page-flip-sheet">
          <div className="page-flip-face page-flip-front chapter-page-blank">
            <div className="page-flip-curl" />
          </div>
          <div className="page-flip-face page-flip-back chapter-page-blank">
            <div className="page-flip-curl page-flip-curl--back" />
          </div>
        </div>
      </div>
    </div>
  )
}
