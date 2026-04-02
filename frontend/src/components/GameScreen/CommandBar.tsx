import { useState, type KeyboardEvent } from 'react'
import { useGameStore } from '../../store/gameStore'

const ACTION_OPTIONS = [
  { value: '', label: '— select action —' },
  { value: 'insert', label: 'INSERT  — inject missing node' },
  { value: 'replace', label: 'REPLACE — overwrite existing node' },
]

export default function CommandBar() {
  const { sendMessage, resetGame, loading, gameState } = useGameStore()
  const [input, setInput] = useState('')
  const [targetNode, setTargetNode] = useState('')
  const [action, setAction] = useState('')

  const events = gameState?.events ?? []

  const buildMessage = (): string => {
    const parts: string[] = []
    if (targetNode) {
      const evt = events.find((e) => e.id === targetNode)
      parts.push(`[TARGET: ${targetNode}${evt ? ' — ' + evt.label : ''}]`)
    }
    if (action) {
      parts.push(`[ACTION: ${action}]`)
    }
    if (input.trim()) {
      parts.push(input.trim())
    }
    return parts.join(' | ')
  }

  const handleSubmit = async () => {
    const msg = buildMessage()
    if (!msg || loading) return
    setInput('')
    setTargetNode('')
    setAction('')
    await sendMessage(msg)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = !loading && buildMessage().length > 0

  const selectClass =
    'bg-[#1B1B1B] border border-[#474747]/40 text-outline font-mono text-[11px] px-2 py-1 focus:outline-none focus:border-primary/60 appearance-none cursor-pointer hover:border-[#474747] transition-colors disabled:opacity-30'

  return (
    <footer
      className="fixed bottom-0 w-full z-50 bg-[#131313] border-t border-[#474747]/20 flex flex-col justify-center px-8 gap-2 py-3"
      style={{ boxShadow: '0 -10px 30px rgba(0,0,0,0.9)', minHeight: '5rem' }}
    >
      {/* Row 1 — structured selectors */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-outline-variant/50 uppercase tracking-widest whitespace-nowrap">
          Target
        </span>
        <select
          value={targetNode}
          onChange={(e) => setTargetNode(e.target.value)}
          disabled={loading || events.length === 0}
          className={`${selectClass} flex-1 max-w-[260px]`}
        >
          <option value="">— select node —</option>
          {events.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.id}  {evt.label}
            </option>
          ))}
        </select>

        <span className="font-mono text-[10px] text-outline-variant/50 uppercase tracking-widest whitespace-nowrap">
          Action
        </span>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          disabled={loading}
          className={`${selectClass} w-[220px]`}
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Preview badge */}
        {(targetNode || action) && (
          <span className="font-mono text-[10px] text-primary/60 truncate max-w-[240px]">
            {targetNode && `${targetNode}`}
            {targetNode && action && ' · '}
            {action && action.toUpperCase()}
          </span>
        )}
      </div>

      {/* Row 2 — reasoning input + actions */}
      <div className="flex items-center gap-4">
        <input
          id="inp"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder={
            loading
              ? ''
              : targetNode || action
              ? 'Describe diagnosis and proposed fix…'
              : 'Enter directive or select node/action above…'
          }
          className="flex-1 bg-transparent text-on-surface font-body text-sm py-1 border-b border-outline-variant/30 focus:outline-none focus:border-primary placeholder:text-outline-variant/30 disabled:opacity-40 transition-colors"
          autoFocus
        />

        <button
          onClick={resetGame}
          disabled={loading}
          className="font-label text-[10px] uppercase tracking-widest text-outline hover:text-white transition-colors disabled:opacity-30"
        >
          RESET
        </button>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-white text-[#131313] px-6 h-9 flex items-center gap-2 font-label text-[0.6875rem] font-bold uppercase hover:invert transition-all duration-100 active:scale-[0.98] disabled:opacity-30"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
          >
            publish
          </span>
          <span>Submit Patch</span>
        </button>
      </div>
    </footer>
  )
}
