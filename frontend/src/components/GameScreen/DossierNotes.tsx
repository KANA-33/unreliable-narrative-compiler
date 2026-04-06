import { useGameStore } from '../../store/gameStore'

export default function DossierNotes() {
  const { gameState } = useGameStore()
  if (!gameState) return null

  const { errors, is_complete, patches_applied } = gameState

  return (
    <div className="sticky-note p-5 -rotate-2 hover:rotate-0 transition-transform duration-300
                    relative flex flex-col overflow-y-auto"
         style={{ width: '75%', height: '100%' }}>

      {/* Push pin */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-50">
        <span className="material-symbols-outlined text-on-background"
              style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
          push_pin
        </span>
      </div>

      {/* Title bar */}
      <div className="flex justify-between items-center mb-3 border-b border-on-background/10 pb-2 mt-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-primary-container"
                style={{ fontSize: 16 }}>edit</span>
          <h4 className="font-headline text-base font-bold italic">Dossier Notes</h4>
        </div>
        <div className="flex items-center gap-3 font-label text-[10px] text-on-background/50">
          <span>Patches: {patches_applied}</span>
          <span className={errors.length > 0 ? 'text-on-primary-container font-bold' : 'text-on-background/50'}>
            Errors: {errors.length}
          </span>
        </div>
      </div>

      {/* Notes list */}
      <ul className="space-y-3 font-headline italic text-sm">
        {is_complete ? (
          <>
            <li className="flex gap-2 items-start">
              <span className="material-symbols-outlined text-on-background/60 flex-shrink-0"
                    style={{ fontSize: 16 }}>check_box</span>
              <span className="line-through opacity-40">All narrative inconsistencies resolved.</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="material-symbols-outlined text-on-background/60 flex-shrink-0"
                    style={{ fontSize: 16 }}>check_box</span>
              <span className="line-through opacity-40">Causal chain verified. Archive integrity: CONFIRMED.</span>
            </li>
            <li className="flex gap-2 items-start font-bold not-italic font-label text-[11px]
                           text-on-background/70 uppercase tracking-wider">
              <span className="material-symbols-outlined text-secondary flex-shrink-0"
                    style={{ fontSize: 16 }}>verified</span>
              <span>Dossier complete. All nodes accounted for.</span>
            </li>
          </>
        ) : (
          <>
            {errors.map((err) => (
              <li key={err.event_id} className="flex gap-2 items-start text-on-primary-container font-bold">
                <span className="material-symbols-outlined flex-shrink-0"
                      style={{ fontSize: 16 }}>priority_high</span>
                <span>
                  Resolve{' '}
                  <span className="underline decoration-wavy">
                    missing tag{err.missing_tags.length > 1 ? 's' : ''}: "{err.missing_tags.join('", "')}"
                  </span>{' '}
                  at node <span className="not-italic font-label text-[11px]">{err.event_id}</span> before
                  narrative collapse.
                </span>
              </li>
            ))}
            <li className="flex gap-2 items-start opacity-50 text-xs">
              <span className="material-symbols-outlined flex-shrink-0"
                    style={{ fontSize: 14 }}>check_box_outline_blank</span>
              <span>
                Identify the causal break — which event requires a tag that was never established?
                <span className="block font-label not-italic text-[9px] mt-0.5 uppercase tracking-wide opacity-70">
                  Tip: Select target node + action below
                </span>
              </span>
            </li>
          </>
        )}
      </ul>
    </div>
  )
}
