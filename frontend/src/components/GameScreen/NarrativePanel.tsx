import { useGameStore } from '../../store/gameStore'
import type { StoryEvent, CompileError } from '../../types'

function EventEntry({ evt, error }: { evt: StoryEvent; error?: CompileError }) {
  const isBug   = !!error
  const isPatch = evt.id.startsWith('evt_patch_')

  return (
    <div className={`relative pl-5 py-2 border-l-2 ${isBug ? 'border-on-primary-container/60' : 'border-on-background/15'}`}>
      {/* Margin annotation for bugs */}
      {isBug && (
        <span className="absolute -left-16 top-0 text-[9px] text-on-primary-container/60
                         font-label uppercase w-14 leading-tight text-right hidden md:block">
          CHECK<br />THIS
        </span>
      )}

      {/* Node label */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-label text-[10px] uppercase tracking-tighter text-on-background/40">
          {evt.id}
        </span>
        <span className="font-label text-[10px] bg-on-background text-surface px-1.5">
          {evt.label}
        </span>
        {isPatch && (
          <span className="font-label text-[10px] text-secondary border border-secondary px-1">
            PATCHED
          </span>
        )}
      </div>

      {/* Narrative text with inline tag highlighting */}
      <p className="font-body text-base leading-relaxed text-on-background/90">
        {evt.text.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < evt.text.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>

      {/* Missing tags */}
      {isBug && error?.missing_tags && (
        <div className="mt-2 flex flex-wrap gap-2">
          {error.missing_tags.map((tag) => (
            <span key={tag}
                  className="font-label text-[10px] px-2 py-0.5 border-2 border-on-primary-container
                             text-on-primary-container rounded-full -rotate-1 inline-block">
              missing: {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NarrativePanel() {
  const { gameState } = useGameStore()
  if (!gameState) return null

  const errorMap = new Map(gameState.errors.map((e) => [e.event_id, e]))

  return (
    <section className="h-full overflow-y-auto bg-surface-container-lowest paper-texture
                        p-8 shadow-sm border-r border-on-background/8 relative rough-edge"
             style={{ transform: 'rotate(-0.5deg)', transformOrigin: 'top left' }}>

      {/* File ref badge */}
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-3xl font-headline italic text-on-background">Narrative Archive</h2>
        <span className="font-label text-[10px] uppercase tracking-tighter bg-on-background text-background px-2 py-1 flex-shrink-0">
          {gameState.story_id.toUpperCase().replace(/_/g, '-').substring(0, 12)}
        </span>
      </div>

      {/* Events */}
      <div className="space-y-8 max-w-2xl pl-6">
        {gameState.events.map((evt) => (
          <EventEntry
            key={evt.id}
            evt={evt}
            error={errorMap.get(evt.id)}
          />
        ))}
      </div>

      {/* Coffee stain decoration */}
      <div className="absolute -top-4 -right-4 w-28 h-28 opacity-10 pointer-events-none rounded-full
                      border-4 border-on-background/30 rotate-12"
           style={{ background: 'radial-gradient(circle at 40% 40%, rgba(28,28,22,0.3), transparent 60%)' }} />
    </section>
  )
}
