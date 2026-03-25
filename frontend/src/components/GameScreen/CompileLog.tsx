import { useGameStore } from '../../store/gameStore'

export default function CompileLog() {
  const { gameState } = useGameStore()
  if (!gameState) return null

  const { errors, is_complete } = gameState

  return (
    <section className="flex-1 p-6 bg-surface-container-lowest flex flex-col overflow-hidden">
      <h4
        className="font-label text-[10px] uppercase tracking-widest mb-4 flex-shrink-0"
        style={{ color: is_complete ? '#e2e2e2' : '#ffb4ab' }}
      >
        {is_complete ? 'Compile_Log_v.OK' : 'Compile_Log_v.ERR'}
      </h4>

      <div className="flex-1 font-mono text-[10px] space-y-1 overflow-y-auto">
        {is_complete ? (
          <>
            <p className="text-primary">[SUCCESS] All nodes compiled.</p>
            <p className="text-outline-variant opacity-40">-- Causal chain satisfied --</p>
            <p className="text-primary">[OK] Narrative integrity: VERIFIED.</p>
          </>
        ) : (
          errors.map((err) => (
            <div key={err.event_id} className="space-y-1 mb-2">
              <p className="text-error">
                [CRITICAL] Missing attribute: '{err.missing_tags.join("', '")}'
              </p>
              <p className="text-error">
                [CRITICAL] Hash mismatch in node '{err.event_id}'
              </p>
              <p className="text-outline-variant opacity-40">
                -- Re-routing to emergency stack --
              </p>
              {err.message && (
                <p className="text-error">
                  [WARNING] {err.message.substring(0, 50)}...
                </p>
              )}
              <p className="text-outline-variant opacity-40">
                -- Process stalled at 14% --
              </p>
              <p className="text-error">
                [CRITICAL] Access denied by SYSTEM_ROOT
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
