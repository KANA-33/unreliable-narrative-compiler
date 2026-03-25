import { useGameStore } from '../../store/gameStore'

const NAV_ITEMS = [
  { icon: 'folder_open',    label: 'Narrative Archive', active: true  },
  { icon: 'account_tree',   label: 'Event Node Graph',  active: false },
  { icon: 'speaker_notes',  label: 'Compiler Dialogue', active: false },
  { icon: 'bug_report',     label: 'Compile Log',       active: false },
]

export default function Sidebar() {
  const { gameState, stories, loadStory, loading } = useGameStore()

  return (
    <aside className="fixed left-0 top-12 w-64 bg-[#1B1B1B] flex flex-col pt-8 space-y-4 z-40"
           style={{ height: 'calc(100vh - 3rem)' }}>

      {/* Title */}
      <div className="px-8 mb-4">
        <h2 className="text-white font-black text-xl tracking-tighter">COMPILER_OS</h2>
        <p className="text-[#474747] text-[10px] uppercase tracking-widest font-bold">RECONSTRUCTION_MODE</p>
      </div>

      {/* Chapter selector */}
      <div className="px-8 pb-2">
        <select
          className="w-full bg-[#2A2A2A] border-b border-white/10 text-white/60 font-label text-[0.65rem] py-1.5 px-2 focus:outline-none focus:border-white/40 disabled:opacity-30 appearance-none"
          value={gameState?.story_id ?? ''}
          onChange={(e) => loadStory(e.target.value)}
          disabled={loading}
        >
          {stories.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#1B1B1B]">
              CH{String(s.chapter).padStart(2, '0')} — {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ icon, label, active }) => (
          <a
            key={label}
            href="#"
            onClick={(e) => e.preventDefault()}
            className={`flex items-center gap-4 font-label text-[0.875rem] uppercase tracking-widest py-3 pl-4 transition-all glitch-hover
              ${active
                ? 'text-white bg-[#2A2A2A] border-l-2 border-white'
                : 'text-[#474747] hover:bg-[#2A2A2A] hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
            <span>{label}</span>
          </a>
        ))}
      </div>

      {/* Auth status */}
      <div className="mt-auto p-6 border-t border-outline-variant/10">
        <div className="bg-surface-container-lowest p-4 scanline-box">
          <p className="text-[9px] text-outline mb-2">AUTH_STATUS</p>
          <p className="text-xs font-bold text-white tracking-widest">LEVEL_04_RESTRICTED</p>
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-[9px] text-outline">ERRORS</span>
              <span className={`text-[9px] font-bold ${(gameState?.errors.length ?? 0) > 0 ? 'text-error' : 'text-primary'}`}>
                {gameState?.errors.length ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[9px] text-outline">PATCHES</span>
              <span className="text-[9px] text-on-surface-variant">{gameState?.patches_applied ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
