import { useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'

export default function Header() {
  const { gameState, stories, loading, completedChapters, turnToChapter, isPageTurning } =
    useGameStore()

  const currentStoryId = gameState?.story_id
  const isComplete = !!gameState?.is_complete

  // Next chapter = the story with the next-highest chapter number after the current one
  const nextStory = useMemo(() => {
    if (!currentStoryId) return null
    const sorted = [...stories].sort((a, b) => a.chapter - b.chapter)
    const idx = sorted.findIndex((s) => s.id === currentStoryId)
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
  }, [stories, currentStoryId])

  const canTurnPage = isComplete && !!nextStory && !loading && !isPageTurning

  const isUnlocked = (storyId: string) =>
    storyId === currentStoryId || completedChapters.includes(storyId)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14
                       flex justify-between items-center px-8
                       bg-background/95 backdrop-blur-sm
                       border-b-2 border-dashed border-on-background/20">

      {/* Brand */}
      <div className="text-lg font-headline italic text-on-background underline decoration-wavy flex-shrink-0">
        Unreliable_Narrative_Compiler
      </div>

      {/* Chapter selector + turn-page button */}
      <div className="flex items-center gap-3">
        <span className="font-label text-[10px] uppercase tracking-widest text-on-background/40 hidden sm:block">
          Chapter
        </span>
        <select
          className="bg-transparent border-b border-on-background/20 text-on-background font-label
                     text-xs py-1 px-2 focus:outline-none focus:border-on-background/60
                     disabled:opacity-30 appearance-none cursor-pointer"
          value={currentStoryId ?? ''}
          onChange={(e) => {
            const id = e.target.value
            if (!isUnlocked(id) || id === currentStoryId) return
            turnToChapter(id)
          }}
          disabled={loading || isPageTurning}
          title="Only completed chapters (and the current one) are selectable."
        >
          {stories.map((s) => {
            const unlocked = isUnlocked(s.id)
            const label = `CH${String(s.chapter).padStart(2, '0')} — ${s.title}`
            return (
              <option
                key={s.id}
                value={s.id}
                disabled={!unlocked}
                className="bg-background"
              >
                {unlocked ? label : `${label}  [LOCKED]`}
              </option>
            )
          })}
        </select>

        {/* Turn-page button — appears once the current chapter is fully compiled */}
        {nextStory && (
          <button
            type="button"
            onClick={() => canTurnPage && turnToChapter(nextStory.id)}
            disabled={!canTurnPage}
            title={
              canTurnPage
                ? `Turn page → CH${String(nextStory.chapter).padStart(2, '0')} ${nextStory.title}`
                : 'Finish compiling this chapter to turn the page.'
            }
            aria-label="Turn page to next chapter"
            className={`group flex items-center gap-1.5 font-label text-[10px] font-bold uppercase
                        tracking-widest px-2.5 py-1 border-2 select-none transition-all
                        ${canTurnPage
                          ? 'border-on-background text-on-background bg-on-background/5 hover:bg-on-background hover:text-background cursor-pointer'
                          : 'border-on-background/25 text-on-background/30 cursor-not-allowed'}`}
          >
            <span className="hidden md:inline">Turn Page</span>
            <span
              className="material-symbols-outlined transition-transform group-hover:translate-x-0.5"
              style={{ fontSize: 18 }}
            >
              arrow_forward
            </span>
          </button>
        )}
      </div>

      {/* Nav + icons */}
      <div className="flex items-center gap-5">
        <div className="hidden lg:flex gap-5 text-sm">
          {['Case Files', 'Evidence', 'Metadata'].map((label, i) => (
            <a key={label} href="#" onClick={(e) => e.preventDefault()}
               className={`font-headline italic transition-transform hover:rotate-1
                 ${i === 0 ? 'text-secondary underline decoration-2' : 'text-on-background/50 hover:text-secondary'}`}>
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 text-on-background/50">
          <span className="material-symbols-outlined hover:text-on-background transition-colors cursor-pointer"
                style={{ fontSize: 18 }}>search</span>
          <span className="material-symbols-outlined hover:text-on-background transition-colors cursor-pointer"
                style={{ fontSize: 18 }}>account_circle</span>
        </div>
      </div>
    </header>
  )
}
