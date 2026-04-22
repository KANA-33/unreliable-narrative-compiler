import { useGameStore } from '../../store/gameStore'

/* Physical red push-pin with specular highlight + cast shadow */
function PushPin() {
  return (
    <svg
      viewBox="0 0 60 60"
      width="46"
      height="46"
      className="drop-shadow-[3px_5px_4px_rgba(0,0,0,0.35)]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pin-head" cx="38%" cy="32%" r="75%">
          <stop offset="0%"  stopColor="#ff9a96" />
          <stop offset="35%" stopColor="#d83b33" />
          <stop offset="80%" stopColor="#8a1410" />
          <stop offset="100%" stopColor="#4a0806" />
        </radialGradient>
        <radialGradient id="pin-shine" cx="30%" cy="25%" r="25%">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Cast shadow on paper */}
      <ellipse cx="32" cy="46" rx="14" ry="2.5" fill="rgba(0,0,0,0.22)" />

      {/* Metal needle peeking below */}
      <path d="M28 38 L32 50 L36 38 Z" fill="#6b6b6b" stroke="#2a2a2a" strokeWidth="0.5" />
      <path d="M28 38 L32 50 L32 38 Z" fill="#3f3f3f" />

      {/* Pin head */}
      <circle cx="30" cy="24" r="16" fill="url(#pin-head)"
              stroke="#3a0503" strokeWidth="0.8" />
      {/* Rim shadow */}
      <circle cx="30" cy="24" r="16" fill="none"
              stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
      {/* Specular highlight */}
      <circle cx="24" cy="18" r="7" fill="url(#pin-shine)" />
    </svg>
  )
}

export default function DossierNotes() {
  const { gameState } = useGameStore()
  if (!gameState) return null

  const { errors, is_complete, patches_applied } = gameState

  return (
    <div className="relative w-full h-full" style={{ transform: 'rotate(-3.5deg)' }}>
      {/* Pin — anchored above the note, center-top */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-30 pointer-events-none">
        <PushPin />
      </div>

      {/* The sticky note itself */}
      <div
        className="sticky-note p-5 relative flex flex-col overflow-y-auto
                   w-full h-full hover:rotate-0 transition-transform duration-300"
      >
        {/* Title bar */}
        <div className="flex justify-between items-center mb-3 border-b-2 border-dashed
                        border-amber-900/25 pb-2 mt-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-900/70"
                  style={{ fontSize: 16 }}>edit_note</span>
            <h4 className="font-marker text-[15px] tracking-wide text-amber-950"
                style={{ transform: 'rotate(-0.8deg)' }}>
              Dossier Notes
            </h4>
          </div>
          <div className="flex items-center gap-3 font-label text-[10px] text-amber-950/60">
            <span>Patches: {patches_applied}</span>
            <span className={errors.length > 0 ? 'marker-red font-bold' : 'text-amber-950/50'}>
              Errors: {errors.length}
            </span>
          </div>
        </div>

        {/* Notes list */}
        <ul className="space-y-3 font-label text-[13px] leading-snug text-amber-950/90">
          {is_complete ? (
            <>
              <li className="flex gap-2 items-start">
                <span className="material-symbols-outlined text-amber-900/60 flex-shrink-0"
                      style={{ fontSize: 16 }}>check_box</span>
                <span className="line-through opacity-50">All narrative inconsistencies resolved.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="material-symbols-outlined text-amber-900/60 flex-shrink-0"
                      style={{ fontSize: 16 }}>check_box</span>
                <span className="line-through opacity-50">Causal chain verified. Archive integrity: CONFIRMED.</span>
              </li>
              <li className="flex gap-2 items-start pt-1">
                <span className="material-symbols-outlined flex-shrink-0 text-green-800"
                      style={{ fontSize: 18 }}>verified</span>
                <span className="marker-blue text-[13px] font-bold uppercase tracking-wide">
                  Dossier complete. All nodes accounted for.
                </span>
              </li>
            </>
          ) : (
            <>
              {errors.map((err) => (
                <li key={err.event_id} className="flex gap-2 items-start">
                  <span className="material-symbols-outlined flex-shrink-0 marker-red"
                        style={{ fontSize: 18 }}>priority_high</span>
                  <span className="marker-red text-[13px] leading-tight">
                    Resolve{' '}
                    <span className="underline decoration-wavy decoration-[#a6151c]">
                      missing tag{err.missing_tags.length > 1 ? 's' : ''}: "{err.missing_tags.join('", "')}"
                    </span>{' '}
                    at node{' '}
                    <span className="font-label text-[11px] px-1 bg-amber-950/10 rounded-sm
                                     not-italic tracking-tight">
                      {err.event_id}
                    </span>{' '}
                    before narrative collapse.
                  </span>
                </li>
              ))}
              <li className="flex gap-2 items-start opacity-75 pt-1">
                <span className="material-symbols-outlined flex-shrink-0 text-amber-900/60"
                      style={{ fontSize: 14 }}>check_box_outline_blank</span>
                <span className="text-[12px]">
                  Identify the causal break — which event requires a tag that was never established?
                  <span className="block mt-1 marker-blue text-[12px]">
                    TIP: Select target node + action below
                  </span>
                </span>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}
