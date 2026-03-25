import { useGameStore } from '../../store/gameStore'
import type { StoryEvent, CompileError } from '../../types'

function fakeTimestamp(index: number) {
  const base = 10 * 3600 + 44 * 60 + index * 376
  const h = Math.floor(base / 3600) % 24
  const m = Math.floor((base % 3600) / 60)
  const s = base % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function EventEntry({ evt, error, index }: { evt: StoryEvent; error?: CompileError; index: number }) {
  const isBug   = !!error
  const isPatch = evt.id.startsWith('evt_patch_')

  const borderCls = isBug ? 'border-error/40' : 'border-white/20'
  const tsColor   = isBug ? 'text-error'       : 'text-primary'

  return (
    <div className={`relative pl-6 border-l ${borderCls} py-2`}>
      {/* Timestamp on the border line */}
      <span className={`absolute left-0 top-0 text-[10px] ${tsColor} bg-background -translate-x-1/2 px-1`}>
        {fakeTimestamp(index)}
      </span>

      <p className="font-headline text-lg text-on-surface leading-tight">
        {evt.text}
      </p>

      <div className="mt-2 flex gap-2 flex-wrap">
        <span className="px-2 py-0.5 text-[9px] bg-surface-container-high text-outline uppercase">
          {evt.label}
        </span>
        {isBug && error?.missing_tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 text-[9px] bg-error-container/20 text-error uppercase font-bold tracking-tighter">
            {tag}
          </span>
        ))}
        {isPatch && (
          <span className="px-2 py-0.5 text-[9px] bg-surface-container-high text-outline uppercase">
            PATCHED
          </span>
        )}
        {!isBug && !isPatch && (
          <span className="px-2 py-0.5 text-[9px] bg-surface-container-high text-outline uppercase">
            SIGNAL_OK
          </span>
        )}
      </div>
    </div>
  )
}

export default function NarrativePanel() {
  const { gameState } = useGameStore()
  if (!gameState) return null

  const errorMap = new Map(gameState.errors.map((e) => [e.event_id, e]))

  return (
    <section className="bg-surface p-6 flex flex-col gap-6 overflow-y-auto border-r border-outline-variant/10 h-full">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-outline-variant/20 pb-4 flex-shrink-0">
        <h3 className="font-headline text-2xl italic text-white">Narrative_Archive</h3>
        <span className="font-label text-[10px] text-outline uppercase tracking-widest">
          {`[TS_INDEX: ${String(gameState.events.length).padStart(4,'0')}]`}
        </span>
      </div>

      {/* Event list */}
      <div className="space-y-8">
        {gameState.events.map((evt, i) => (
          <EventEntry key={evt.id} evt={evt} error={errorMap.get(evt.id)} index={i} />
        ))}
      </div>
    </section>
  )
}
