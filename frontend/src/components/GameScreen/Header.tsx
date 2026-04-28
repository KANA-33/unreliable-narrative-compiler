import { useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import SettingsMenu from '../SettingsMenu'

export default function Header() {
  const { gameState, stories, loading, completedChapters, turnToChapter, isPageTurning } =
    useGameStore()

  const currentStoryId = gameState?.story_id
  // Same gating as the ending arrow: only count a chapter as complete once
  // every choice node has actually been resolved.
  const isComplete =
    !!gameState?.is_complete &&
    !gameState.events.some((e) => e.type === 'choice' && !e.resolved_choice_id)

  const sortedStories = useMemo(
    () => [...stories].sort((a, b) => a.chapter - b.chapter),
    [stories],
  )

  const currentIdx = useMemo(
    () => (currentStoryId ? sortedStories.findIndex((s) => s.id === currentStoryId) : -1),
    [sortedStories, currentStoryId],
  )

  const currentStory = currentIdx >= 0 ? sortedStories[currentIdx] : null
  const prevStory = currentIdx > 0 ? sortedStories[currentIdx - 1] : null
  const nextStory = currentIdx >= 0 && currentIdx < sortedStories.length - 1
    ? sortedStories[currentIdx + 1]
    : null

  // Forward: only when the current chapter compiles clean AND a next chapter exists.
  const canTurnForward = isComplete && !!nextStory && !loading && !isPageTurning
  // Backward: any time a previous chapter exists — review mode is always allowed.
  const canTurnBack = !!prevStory && !loading && !isPageTurning
                      && (completedChapters.includes(prevStory.id)
                          || prevStory.id === currentStoryId)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14
                       flex justify-between items-center px-8
                       bg-background/95 backdrop-blur-sm
                       border-b-2 border-dashed border-on-background/20">

      {/* Brand */}
      <div className="text-lg font-headline italic text-on-background underline decoration-wavy flex-shrink-0">
        Unreliable_Narrative_Compiler
      </div>

      {/* Chapter navigation — prev | current label | next */}
      <div className="flex items-center gap-3">

        {/* Previous-page button */}
        <button
          type="button"
          onClick={() => canTurnBack && prevStory && turnToChapter(prevStory.id)}
          disabled={!canTurnBack}
          title={
            !prevStory
              ? 'This is the first chapter.'
              : canTurnBack
                ? `Turn back → CH${String(prevStory.chapter).padStart(2, '0')} ${prevStory.title}`
                : 'Previous chapter is unavailable.'
          }
          aria-label="Turn page to previous chapter"
          className={`group flex items-center gap-1.5 font-label text-[10px] font-bold uppercase
                      tracking-widest px-2.5 py-1 border-2 select-none transition-all
                      ${canTurnBack
                        ? 'border-on-background text-on-background bg-on-background/5 hover:bg-on-background hover:text-background cursor-pointer'
                        : 'border-on-background/25 text-on-background/30 cursor-not-allowed'}`}
        >
          <span
            className="material-symbols-outlined transition-transform group-hover:-translate-x-0.5"
            style={{ fontSize: 18 }}
          >
            arrow_back
          </span>
          <span className="hidden md:inline">Prev</span>
        </button>

        {/* Current chapter readout — plain label, no longer a selector */}
        <div className="flex items-baseline gap-2 px-2">
          <span className="font-label text-[10px] uppercase tracking-widest text-on-background/40 hidden sm:block">
            Chapter
          </span>
          <span className="font-label text-xs text-on-background whitespace-nowrap">
            {currentStory
              ? `CH${String(currentStory.chapter).padStart(2, '0')} — ${currentStory.title}`
              : '—'}
          </span>
        </div>

        {/* Next-page button */}
        <button
          type="button"
          onClick={() => canTurnForward && nextStory && turnToChapter(nextStory.id)}
          disabled={!canTurnForward}
          title={
            !nextStory
              ? 'This is the final chapter.'
              : canTurnForward
                ? `Turn page → CH${String(nextStory.chapter).padStart(2, '0')} ${nextStory.title}`
                : 'Finish compiling this chapter to turn the page.'
          }
          aria-label="Turn page to next chapter"
          className={`group flex items-center gap-1.5 font-label text-[10px] font-bold uppercase
                      tracking-widest px-2.5 py-1 border-2 select-none transition-all
                      ${canTurnForward
                        ? 'border-on-background text-on-background bg-on-background/5 hover:bg-on-background hover:text-background cursor-pointer'
                        : 'border-on-background/25 text-on-background/30 cursor-not-allowed'}`}
        >
          <span className="hidden md:inline">Next</span>
          <span
            className="material-symbols-outlined transition-transform group-hover:translate-x-0.5"
            style={{ fontSize: 18 }}
          >
            arrow_forward
          </span>
        </button>
      </div>

      {/* Nav + icons */}
      <div className="flex items-center gap-5">
        <div className="hidden lg:flex gap-5 text-sm">
          <a href="#" onClick={(e) => e.preventDefault()}
             className="font-headline italic transition-transform hover:rotate-1 text-secondary underline decoration-2">
            Case Files
          </a>
        </div>
        <div className="flex items-center gap-2 text-on-background/50">
          <SettingsMenu iconSize={18} />
        </div>
      </div>
    </header>
  )
}
