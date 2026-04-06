import { useRef, useLayoutEffect, useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { StoryEvent, CompileError } from '../../types'

// Sketch box SVG overlay — hand-drawn rectangle using global turbulence filter
function SketchBox({ width, height }: { width: number; height: number }) {
  const pad = 10
  const svgW = width + pad * 2
  const svgH = height + pad * 2
  const rx = pad - 3
  const ry = pad - 4
  const rw = width + 6
  const rh = height + 8

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{
        position: 'absolute',
        top: -pad,
        left: -pad,
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'visible',
      }}
    >
      {/* Shadow stroke */}
      <rect x={rx} y={ry} width={rw} height={rh}
            fill="none" stroke="rgba(28,28,22,0.15)" strokeWidth="4.5" rx="2"
            filter="url(#g-sketch-sel)" />
      {/* Main ink stroke */}
      <rect x={rx} y={ry} width={rw} height={rh}
            fill="none" stroke="#1c1c16" strokeWidth="2" rx="2"
            filter="url(#g-sketch-sel)" />
    </svg>
  )
}

function EventEntry({
  evt, error, isSelected, onSelect,
}: {
  evt: StoryEvent
  error?: CompileError
  isSelected: boolean
  onSelect: () => void
}) {
  const isBug   = !!error
  const isPatch = evt.id.startsWith('evt_patch_')
  const divRef  = useRef<HTMLDivElement>(null)
  const [boxSize, setBoxSize] = useState<{ w: number; h: number } | null>(null)

  // Measure element size for the sketch box
  useLayoutEffect(() => {
    if (isSelected && divRef.current) {
      const r = divRef.current.getBoundingClientRect()
      setBoxSize({ w: r.width, h: r.height })
    } else {
      setBoxSize(null)
    }
  }, [isSelected])

  // Scroll into view when selected from the graph side
  useEffect(() => {
    if (isSelected && divRef.current) {
      divRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])

  return (
    <div
      ref={divRef}
      onClick={onSelect}
      className={`relative pl-5 py-2 border-l-2 cursor-pointer transition-colors duration-150
        ${isBug ? 'border-on-primary-container/60' : 'border-on-background/15'}
        ${isSelected ? 'bg-on-background/[0.04]' : 'hover:bg-on-background/[0.025]'}
      `}
    >
      {/* Hand-drawn sketch box when selected */}
      {isSelected && boxSize && (
        <SketchBox width={boxSize.w} height={boxSize.h} />
      )}

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
        {isSelected && (
          <span className="font-label text-[10px] text-on-background/50 italic ml-auto pr-2">
            selected
          </span>
        )}
      </div>

      {/* Narrative text */}
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
  const { gameState, selectedEventId, setSelectedEventId } = useGameStore()
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
            isSelected={selectedEventId === evt.id}
            onSelect={() =>
              setSelectedEventId(selectedEventId === evt.id ? null : evt.id)
            }
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
