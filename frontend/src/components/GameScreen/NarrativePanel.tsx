import { useRef, useLayoutEffect, useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { StoryEvent, CompileError } from '../../types'
import RedactableText from '../RedactableText'
import Typewriter from '../Typewriter'

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
  evt, error, isSelected, isPatchingTarget, onSelect, onChoose, choiceBusy, animate,
}: {
  evt: StoryEvent
  error?: CompileError
  isSelected: boolean
  isPatchingTarget: boolean
  onSelect: () => void
  onChoose: (choiceId: string) => void
  choiceBusy: boolean
  animate: boolean
}) {
  const isBug   = !!error
  const isPatch = evt.id.startsWith('evt_patch_')
  const divRef  = useRef<HTMLDivElement>(null)
  const [boxSize, setBoxSize] = useState<{ w: number; h: number } | null>(null)

  // Measure element size for the sketch box. Use a ResizeObserver so the box
  // tracks the div as it grows during the Typewriter animation (and any other
  // layout shift, like font loading or window resize). A one-shot measure on
  // selection would lock the box at whatever height existed in that frame —
  // usually before the typewriter has finished, leaving the border trailing
  // far short of the actual text.
  useLayoutEffect(() => {
    if (!isSelected || !divRef.current) {
      setBoxSize(null)
      return
    }
    const el = divRef.current
    const update = () => {
      const r = el.getBoundingClientRect()
      setBoxSize({ w: r.width, h: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
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
      <p className="whitespace-pre-wrap">
        {animate && !isPatchingTarget ? (
          <Typewriter
            text={evt.text}
            className="font-body text-base leading-relaxed text-on-background/90"
          />
        ) : (
          <RedactableText
            originalText={evt.text}
            isPatching={isPatchingTarget}
            isRedacted={false}
          />
        )}
      </p>

      {/* Choice branches — only on unresolved choice nodes. Once a choice
          has been committed the original prompt node still shows (so the
          dilemma stays readable) but its buttons lock and the resolution
          appears as a new node directly beneath it. */}
      {evt.type === 'choice' && evt.choices && evt.choices.length > 0 && !evt.resolved_choice_id && (
        <div className="mt-3 flex flex-wrap gap-2">
          {evt.choices.map((c) => (
            <button
              key={c.id}
              onClick={(e) => { e.stopPropagation(); onChoose(c.id) }}
              disabled={choiceBusy}
              className="font-label text-[11px] uppercase tracking-widest
                         px-3 py-1.5 border-2 border-on-background bg-surface
                         text-on-background
                         hover:bg-on-background hover:text-surface
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Resolved choice badge */}
      {evt.type === 'resolved' && evt.resolved_choice_id && (
        <div className="mt-2 font-label text-[10px] uppercase tracking-wider
                        text-on-background/50">
          branch committed: <span className="font-bold">{evt.resolved_choice_id}</span>
        </div>
      )}

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
  const { gameState, selectedEventId, setSelectedEventId, patchingPath,
          submitChoice, isPatching } = useGameStore()

  // Track each event's last-rendered text, so we typewriter-in any event whose
  // text is new to us — whether it's a freshly-appended node (patch) or an
  // existing node whose text was rewritten (e.g. a choice branch committing).
  const seenTextsRef = useRef<Map<string, string>>(new Map())
  const storyIdRef = useRef<string | null>(null)
  const [newlyAdded, setNewlyAdded] = useState<Set<string>>(new Set())

  useLayoutEffect(() => {
    if (!gameState) return
    // Chapter change: seed the map without animating anything —
    // the page-turn overlay already covers this transition.
    if (storyIdRef.current !== gameState.story_id) {
      storyIdRef.current = gameState.story_id
      seenTextsRef.current = new Map(gameState.events.map((e) => [e.id, e.text]))
      setNewlyAdded((prev) => (prev.size === 0 ? prev : new Set()))
      return
    }
    const changed = new Set<string>()
    for (const e of gameState.events) {
      if (seenTextsRef.current.get(e.id) !== e.text) {
        changed.add(e.id)
        seenTextsRef.current.set(e.id, e.text)
      }
    }
    if (changed.size > 0) setNewlyAdded(changed)
  }, [gameState])

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
            isPatchingTarget={patchingPath?.targetId === evt.id}
            onSelect={() =>
              setSelectedEventId(selectedEventId === evt.id ? null : evt.id)
            }
            onChoose={(choiceId) => submitChoice(evt.id, choiceId)}
            choiceBusy={isPatching}
            animate={newlyAdded.has(evt.id)}
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
