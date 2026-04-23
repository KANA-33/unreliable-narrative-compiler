import { useRef, useState, useEffect, useCallback } from 'react'

interface GraphNode {
  id: string
  label: string
  title: string
  status: 'idle' | 'active' | 'target' | 'error'
}

interface GraphEdge {
  sourceId: string
  targetId: string
  status: 'valid' | 'broken' | 'patching'
}

interface EventNodeGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface Line { x1: number; y1: number; x2: number; y2: number }

const NODE_ROTATIONS = [-3, 4, 1, -5, 2, -1, 4, -3]

const NODE_STYLE: Record<GraphNode['status'], string> = {
  target: 'bg-[#1c1c16] border-[#1c1c16] text-[#f4ecd7] scale-110 shadow-lg',
  active: 'bg-[#e8d28a] border-[#1c1c16] text-[#1c1c16] scale-105 shadow-md',
  error:  'bg-[#f4ecd7] border-[#a6151c] text-[#a6151c] scale-105 shadow-md',
  idle:   'bg-[#f8f0d8] border-[#1c1c16]/60 text-[#1c1c16] opacity-90',
}

const EDGE_STROKE: Record<GraphEdge['status'], { color: string; dash?: string; animate?: boolean }> = {
  valid:    { color: 'rgba(28,28,22,0.62)' },
  broken:   { color: 'rgba(166,21,28,0.82)', dash: '2 6' },
  patching: { color: 'rgba(28,28,22,0.62)', dash: '6 4', animate: true },
}

function NodeCard({
  node, rotDeg, refCallback,
}: {
  node: GraphNode
  rotDeg: number
  refCallback: (el: HTMLDivElement | null) => void
}) {
  const statusLabel =
    node.status === 'target' ? 'TARGET' :
    node.status === 'active' ? 'ACTIVE' :
    node.status === 'error'  ? 'ERROR'  : node.label

  return (
    <div
      ref={refCallback}
      className={`p-3 border-2 shadow-sm text-center select-none transition-all duration-200
                  font-body ${NODE_STYLE[node.status]}`}
      style={{
        transform: `rotate(${rotDeg}deg)`,
        width: '110px',
        boxShadow: '2px 3px 0 rgba(28,28,22,0.18), 4px 6px 10px rgba(28,28,22,0.12)',
      }}
    >
      <span className={`font-label text-[9px] font-bold block uppercase tracking-wider
                        ${node.status === 'target' ? 'text-[#f4ecd7]/70' : 'opacity-60'}`}>
        {statusLabel}
      </span>
      <div className="text-[12px] mt-1 font-bold truncate font-body">
        {node.title}
      </div>
      <div className={`font-body text-[9px] mt-0.5 italic
                       ${node.status === 'target' ? 'text-[#f4ecd7]/60' : 'text-[#1c1c16]/50'}`}>
        {node.label}
      </div>
    </div>
  )
}

export default function EventNodeGraph({ nodes, edges }: EventNodeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs     = useRef<Map<string, HTMLDivElement>>(new Map())
  const [lines, setLines] = useState<(Line & { status: GraphEdge['status']; key: string })[]>([])

  const recalc = useCallback(() => {
    if (!containerRef.current) return
    const box = containerRef.current.getBoundingClientRect()
    const next: (Line & { status: GraphEdge['status']; key: string })[] = []

    edges.forEach((e, i) => {
      const a = nodeRefs.current.get(e.sourceId)
      const b = nodeRefs.current.get(e.targetId)
      if (!a || !b) return
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      next.push({
        key: `${e.sourceId}->${e.targetId}-${i}`,
        status: e.status,
        x1: ra.left + ra.width  / 2 - box.left,
        y1: ra.top  + ra.height / 2 - box.top,
        x2: rb.left + rb.width  / 2 - box.left,
        y2: rb.top  + rb.height / 2 - box.top,
      })
    })
    setLines(next)
  }, [edges])

  useEffect(() => {
    const t = setTimeout(recalc, 60)
    window.addEventListener('resize', recalc)

    // Recalc when the card reflows (e.g. nodes wrap to a new row and the
    // container grows vertically). Watches both the outer card and the
    // nodes row so wrap-induced size changes trigger edge redraws.
    const ro = new ResizeObserver(() => recalc())
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', recalc)
      ro.disconnect()
    }
  }, [nodes, edges, recalc])

  return (
    <div className="relative w-full max-w-5xl mx-auto"
         style={{ transform: 'rotate(-1.2deg)' }}>

      {/* Top-center pin pinning the card to the desk */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-30 pointer-events-none">
        <svg viewBox="0 0 60 60" width="40" height="40"
             className="drop-shadow-[3px_4px_3px_rgba(0,0,0,0.35)]">
          <defs>
            <radialGradient id="graph-pin-head" cx="38%" cy="32%" r="75%">
              <stop offset="0%"  stopColor="#7ad3ff" />
              <stop offset="40%" stopColor="#1f6fa8" />
              <stop offset="100%" stopColor="#0a2a45" />
            </radialGradient>
            <radialGradient id="graph-pin-shine" cx="30%" cy="25%" r="25%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          <ellipse cx="30" cy="44" rx="12" ry="2.5" fill="rgba(0,0,0,0.22)" />
          <path d="M27 34 L30 46 L33 34 Z" fill="#6b6b6b" stroke="#2a2a2a" strokeWidth="0.5" />
          <circle cx="30" cy="22" r="14" fill="url(#graph-pin-head)"
                  stroke="#07192a" strokeWidth="0.8" />
          <circle cx="25" cy="16" r="6" fill="url(#graph-pin-shine)" />
        </svg>
      </div>

      {/* Pinned card wrapper */}
      <div ref={containerRef}
           className="relative pinned-card p-8 pt-10 pb-10 overflow-visible">

        {/* Card header */}
        <div className="flex items-center justify-between mb-4 border-b-2 border-dashed
                        border-amber-900/25 pb-2 pointer-events-none relative z-20">
          <h3 className="font-label text-[11px] tracking-[0.25em] uppercase text-amber-950/70">
            Exhibit A · Causal Chain
          </h3>
          <span className="font-label text-[10px] text-amber-950/50 italic">
            filed: case #{String(nodes.length).padStart(3, '0')}
          </span>
        </div>

        {/* SVG overlay for edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          <defs>
            <filter id="eng-pencil" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" result="n" seed="13" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="5.5"
                                 xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="eng-pencil-soft" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="n2" seed="21" />
              <feDisplacementMap in="SourceGraphic" in2="n2" scale="3.5"
                                 xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <marker id="eng-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0.5 L5,3 L0,5.5" fill="none"
                    stroke="rgba(28,28,22,0.62)" strokeWidth="1" strokeLinecap="round" />
            </marker>
          </defs>

          {lines.map((l, i) => {
            const cfg = EDGE_STROKE[l.status]

            // When wrap puts source and target on different rows, a simple
            // Q-curve between their centers crosses the gap awkwardly.
            // Use a cubic Bezier with horizontal handles so the line leaves
            // the source heading sideways and arrives heading sideways,
            // producing a smooth "row-to-row" transition.
            const dy = l.y2 - l.y1
            const wrapped = Math.abs(dy) > 60
            let d: string
            if (wrapped) {
              const handle = 60
              const cp1x = l.x1 + handle
              const cp1y = l.y1
              const cp2x = l.x2 - handle
              const cp2y = l.y2
              d = `M ${l.x1} ${l.y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${l.x2} ${l.y2}`
            } else {
              const mx = (l.x1 + l.x2) / 2
              const my = (l.y1 + l.y2) / 2 + (i % 2 === 0 ? -8 : 8)
              d = `M ${l.x1} ${l.y1} Q ${mx} ${my} ${l.x2} ${l.y2}`
            }
            return (
              <g key={l.key}>
                {/* Shadow ghost stroke */}
                <path d={d} fill="none" stroke="rgba(28,28,22,0.1)" strokeWidth="4"
                      strokeLinecap="round" filter="url(#eng-pencil-soft)" />
                {/* Main stroke */}
                <path
                  d={d}
                  fill="none"
                  stroke={cfg.color}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeDasharray={cfg.dash}
                  filter="url(#eng-pencil)"
                  markerEnd="url(#eng-arrow)"
                >
                  {cfg.animate && (
                    <animate attributeName="stroke-dashoffset"
                             from="0" to="-20" dur="0.9s" repeatCount="indefinite" />
                  )}
                </path>
              </g>
            )
          })}
        </svg>

        {/* Nodes row — wraps to multiple rows when width runs out.
            Column gap keeps nodes breathable; larger row gap leaves space
            for the curved connector to arc between rows. */}
        <div className="flex flex-wrap gap-x-10 gap-y-14 items-center justify-center relative
                        min-h-[140px] w-full py-4"
             style={{ zIndex: 10 }}>
          {nodes.map((n, i) => (
            <NodeCard
              key={n.id}
              node={n}
              rotDeg={NODE_ROTATIONS[i % NODE_ROTATIONS.length]}
              refCallback={(el) => {
                if (el) nodeRefs.current.set(n.id, el)
                else    nodeRefs.current.delete(n.id)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
