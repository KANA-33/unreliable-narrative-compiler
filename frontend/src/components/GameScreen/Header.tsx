import { useGameStore } from '../../store/gameStore'

export default function Header() {
  const { gameState, stories, loadStory, loading } = useGameStore()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14
                       flex justify-between items-center px-8
                       bg-background/95 backdrop-blur-sm
                       border-b-2 border-dashed border-on-background/20">

      {/* Brand */}
      <div className="text-lg font-headline italic text-on-background underline decoration-wavy flex-shrink-0">
        THE_LIVING_DOSSIER
      </div>

      {/* Chapter selector */}
      <div className="flex items-center gap-2">
        <span className="font-label text-[10px] uppercase tracking-widest text-on-background/40 hidden sm:block">
          Chapter
        </span>
        <select
          className="bg-transparent border-b border-on-background/20 text-on-background font-label
                     text-xs py-1 px-2 focus:outline-none focus:border-on-background/60
                     disabled:opacity-30 appearance-none cursor-pointer"
          value={gameState?.story_id ?? ''}
          onChange={(e) => loadStory(e.target.value)}
          disabled={loading}
        >
          {stories.map((s) => (
            <option key={s.id} value={s.id} className="bg-background">
              CH{String(s.chapter).padStart(2, '0')} — {s.title}
            </option>
          ))}
        </select>
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
