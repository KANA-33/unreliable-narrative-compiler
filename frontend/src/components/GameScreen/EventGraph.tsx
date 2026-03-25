import { useGameStore } from '../../store/gameStore'
import type { StoryEvent, CompileError } from '../../types'

function Node({ evt, error }: { evt: StoryEvent; error?: CompileError }) {
  const isBug   = !!error
  const isPatch = evt.id.startsWith('evt_patch_')

  const bgCls = isBug ? 'bg-surface-container-high' : 'bg-surface'

  const badgeCls = isBug
    ? 'bg-error-container text-white'
    : isPatch
    ? 'bg-surface-container-highest text-on-surface-variant'
    : 'bg-surface-container-highest text-primary'

  const label = evt.label.length > 6
    ? evt.label.substring(0, 6).toUpperCase()
    : evt.label.toUpperCase()

  return (
    <div className="group cursor-crosshair flex-shrink-0">
      <div className={`border border-white/40 p-3 ${bgCls} hover:border-white transition-colors flex flex-col items-center gap-1 w-24`}>
        <span className="text-[9px] text-outline">{evt.id}</span>
        <span className="text-xs font-bold text-white">{label}</span>
        <span className={`text-[8px] px-1 ${badgeCls}`}>
          {isBug ? 'BUG' : isPatch ? 'FIX' : 'OK'}
        </span>
      </div>
    </div>
  )
}

export default function EventGraph() {
  const { gameState } = useGameStore()
  if (!gameState) return null

  const errorMap = new Map(gameState.errors.map((e) => [e.event_id, e]))

  return (
    <section
      className="bg-surface-container-low p-6 border-b border-outline-variant/10 relative scanline-box overflow-hidden flex-shrink-0"
      style={{ height: '50%' }}
    >
      {/* Blueprint background image */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <img
          alt="Technical Blueprint"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxrC-9mZRc-oC9M2W26HxvvMpmereI8YQke_wVwAazTKYriQIt4VyYf4d8EwZKXPhhwIH7qvKnTjLOf3Bb2xEUicbo830vAcLF2Sxy4YQnbshqGX15lbwR1FKpcBHNePlzTmSB8WdEIaM9cj6SkgD2BIHVwDcs1bRMl1LTlRrT3LWdpzl5NscjeXFUcMuXUt3yVmqR0oUoGIDbFiWKTr38pqRXt9RTeTt6Mfo0lbNil3oZKYD_szjF0i9Pnza2G67B68G9BTQcvzk"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Graph header */}
      <div className="flex justify-between items-center mb-8 relative z-10">
        <h3 className="font-label text-xs font-bold uppercase tracking-[0.3em] text-white">
          Event_Node_Graph_v1
        </h3>
        <div className="flex gap-4">
          <span className="text-[10px] text-primary flex items-center gap-1">
            <span className="w-1 h-1 bg-primary inline-block" /> ACTIVE
          </span>
          <span className="text-[10px] text-outline flex items-center gap-1">
            <span className="w-1 h-1 bg-outline inline-block" /> IDLE
          </span>
        </div>
      </div>

      {/* Nodes */}
      <div className="flex flex-wrap gap-8 justify-center items-center relative z-10 py-6">
        {gameState.events.map((evt, i) => (
          <div key={evt.id} className="flex items-center">
            {i > 0 && <div className="w-12 h-px bg-white/20 self-center mr-8 flex-shrink-0" />}
            <Node evt={evt} error={errorMap.get(evt.id)} />
          </div>
        ))}
      </div>
    </section>
  )
}
