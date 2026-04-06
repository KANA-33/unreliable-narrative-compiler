import { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { StoryEvent, CompileError } from '../../types'

const NODE_ROTATIONS = [-2, 3, 1, -4, 2, -1, 3, -2]

interface Connector { x1: number; y1: number; x2: number; y2: number }

function Node({
  evt, error, rotDeg, refCallback,
}: {
  evt: StoryEvent
  error?: CompileError
  rotDeg: number
  refCallback: (el: HTMLDivElement | null) => void
}) {
  const isBug   = !!error
  const isPatch = evt.id.startsWith('evt_patch_')
  const isActive = isBug

  return (
    <div
      ref={refCallback}
      className={`p-3 border-2 shadow-sm text-center transition-all duration-300 hover:shadow-md select-none
        ${isActive
          ? 'bg-secondary-container border-on-background scale-110 shadow-md'
          : isPatch
          ? 'bg-background border-secondary'
          : 'bg-background border-on-background opacity-80 hover:opacity-100'
        }`}
      style={{ transform: `rotate(${rotDeg}deg)`, width: '90px' }}
    >
      <span className="font-label text-[9px] font-bold block">
        {isActive ? 'ACTIVE' : evt.id.replace('evt_', 'NODE_')}
      </span>
      <div className={`text-xs mt-1 font-bold ${isActive ? 'text-white' : 'text-on-background'}`}>
        {evt.label.length > 8 ? evt.label.substring(0, 8) : evt.label}
      </div>
      {isPatch && (
        <span className="text-[8px] text-secondary font-label">PATCHED</span>
      )}
    </div>
  )
}

export default function EventGraph() {
  const { gameState } = useGameStore()
  const nodeRefs      = useRef<(HTMLDivElement | null)[]>([])
  const containerRef  = useRef<HTMLDivElement>(null)
  const [connectors, setConnectors] = useState<Connector[]>([])

  const recalc = useCallback(() => {
    if (!containerRef.current) return
    const box = containerRef.current.getBoundingClientRect()
    const next: Connector[] = []

    for (let i = 0; i < nodeRefs.current.length - 1; i++) {
      const a = nodeRefs.current[i]
      const b = nodeRefs.current[i + 1]
      if (!a || !b) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      next.push({
        x1: ra.left + ra.width  / 2 - box.left,
        y1: ra.top  + ra.height / 2 - box.top,
        x2: rb.left + rb.width  / 2 - box.left,
        y2: rb.top  + rb.height / 2 - box.top,
      })
    }
    setConnectors(next)
  }, [])

  // Recalc whenever events change or window resizes
  useEffect(() => {
    const t = setTimeout(recalc, 80)
    window.addEventListener('resize', recalc)
    return () => { clearTimeout(t); window.removeEventListener('resize', recalc) }
  }, [gameState?.events, recalc])

  if (!gameState) return null

  const errorMap = new Map(gameState.errors.map((e) => [e.event_id, e]))

  // Keep refs array in sync with event count
  nodeRefs.current = nodeRefs.current.slice(0, gameState.events.length)

  return (
    <section
      className="bg-surface-container-high p-5 border-b border-on-background/10
                 relative overflow-hidden flex flex-col rotate-1"
      style={{ height: '55%', flexShrink: 0 }}
    >
      {/* Blueprint background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <img
          alt="Blueprint background"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHIhiwqL4X3g143HlWJMrUt9d1np2jKL0r9wZA6YThJ8ITxvdMtuQ8d1qc1eQEGDo2-DExuDZU943Kx2SHt6OwulOYrlkxMh1f5KFbhH1Rt_gb1fq43QNULeU_fRXdPXVzbc3zxRGvXqKqyXSxxklU2ixAMg7rDG76pQ5p46KadgNKQBWnWk3ObiZYrxEDdjn-Gz0XvdFugvhvcY2iw4xZWfuiBwfWn1K9SZ3sTRBfiWQtWmRBL0-eOf9XgcLj728oxjtWy1dSRtHz"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-3 relative z-10">
        <h3 className="font-label text-xs font-bold uppercase tracking-widest text-on-background">
          Event Node Graph
        </h3>
        <div className="flex gap-4">
          <span className="text-[10px] text-secondary font-label flex items-center gap-1">
            <span className="w-2 h-2 bg-secondary-container border border-on-background inline-block" />
            ACTIVE
          </span>
          <span className="text-[10px] text-on-background/40 font-label flex items-center gap-1">
            <span className="w-2 h-2 bg-background border-2 border-on-background/40 inline-block" />
            IDLE
          </span>
        </div>
      </div>

      {/* Node area with SVG overlay */}
      <div ref={containerRef} className="flex-1 relative border-2 border-dashed border-on-background/10 overflow-hidden p-3">

        {/* Hand-drawn connector lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <defs>
            {/* Pencil / hand-drawn displacement filter */}
            <filter id="pencil-stroke" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.03"
                numOctaves="3"
                result="noise"
                seed="7"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="3"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            {/* Arrow marker */}
            <marker id="ink-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0.5 L5,3 L0,5.5" fill="none"
                    stroke="rgba(28,28,22,0.45)" strokeWidth="1" strokeLinecap="round" />
            </marker>
          </defs>

          {connectors.map((c, i) => {
            // Slight hand-drawn wobble via quadratic bezier
            const mx = (c.x1 + c.x2) / 2
            const my = (c.y1 + c.y2) / 2 + (i % 2 === 0 ? -5 : 5)
            const d  = `M ${c.x1} ${c.y1} Q ${mx} ${my} ${c.x2} ${c.y2}`

            return (
              <g key={i}>
                {/* Shadow stroke for depth */}
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(28,28,22,0.12)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#pencil-stroke)"
                />
                {/* Main ink stroke */}
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(28,28,22,0.45)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  filter="url(#pencil-stroke)"
                  markerEnd="url(#ink-arrow)"
                />
              </g>
            )
          })}
        </svg>

        {/* Nodes */}
        <div className="flex flex-wrap gap-8 justify-center items-center h-full relative" style={{ zIndex: 10 }}>
          {gameState.events.map((evt, i) => (
            <Node
              key={evt.id}
              evt={evt}
              error={errorMap.get(evt.id)}
              rotDeg={NODE_ROTATIONS[i % NODE_ROTATIONS.length]}
              refCallback={(el) => { nodeRefs.current[i] = el }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
