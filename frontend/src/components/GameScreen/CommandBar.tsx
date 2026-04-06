import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { DialogueMessage } from '../../types'

const ACTION_OPTIONS = [
  { value: '',        label: '— select action —' },
  { value: 'insert',  label: 'INSERT  — inject missing node' },
  { value: 'replace', label: 'REPLACE — overwrite existing node' },
]

function Message({ msg }: { msg: DialogueMessage }) {
  if (msg.role === 'operator') {
    return (
      <div className="flex gap-2 items-start">
        <span className="font-label text-[10px] uppercase tracking-wider text-on-background/40
                         flex-shrink-0 mt-0.5 w-14 text-right">You</span>
        <p className="text-sm font-body text-on-background leading-snug">{msg.text}</p>
      </div>
    )
  }
  if (msg.role === 'compiler') {
    return (
      <div className="flex gap-2 items-start">
        <span className="font-label text-[10px] uppercase tracking-wider text-secondary/70
                         flex-shrink-0 mt-0.5 w-14 text-right">Archivist</span>
        <p className={`text-sm italic font-headline text-on-background/80 leading-snug
                       whitespace-pre-wrap ${msg.loading ? 'loading' : ''}`}>
          {msg.text}
        </p>
      </div>
    )
  }
  return (
    <div className="flex gap-2 items-start">
      <span className="font-label text-[10px] uppercase tracking-wider text-outline/50
                       flex-shrink-0 mt-0.5 w-14 text-right">—</span>
      <p className="text-xs font-label text-outline/60 leading-snug">{msg.text}</p>
    </div>
  )
}

export default function CommandBar() {
  const { sendMessage, resetGame, loading, gameState, messages } = useGameStore()
  const [input, setInput]         = useState('')
  const [targetNode, setTargetNode] = useState('')
  const [action, setAction]       = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const events = gameState?.events ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildMessage = (): string => {
    const parts: string[] = []
    if (targetNode) {
      const evt = events.find((e) => e.id === targetNode)
      parts.push(`[TARGET: ${targetNode}${evt ? ' — ' + evt.label : ''}]`)
    }
    if (action) parts.push(`[ACTION: ${action}]`)
    if (input.trim()) parts.push(input.trim())
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

  const selectCls = `bg-background border border-on-background/20 text-on-background/80
                     font-label text-[11px] px-2 py-1.5 focus:outline-none
                     focus:border-on-background/60 appearance-none cursor-pointer
                     hover:border-on-background/40 transition-colors disabled:opacity-30`

  return (
    <footer className="fixed bottom-0 w-full z-50 bg-background/97 backdrop-blur-sm
                       border-t-4 border-double border-on-background/25 shadow-2xl">

      {/* Dialogue strip — 28vh */}
      <div className="overflow-y-auto px-8 pt-3 pb-2 space-y-2 border-b border-on-background/10"
           style={{ height: '28vh' }}>
        {messages.length === 0 ? (
          <p className="text-[11px] font-label italic text-on-background/30">
            -- Awaiting operator directive --
          </p>
        ) : (
          messages.slice(-8).map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="px-8 py-3 flex flex-col gap-2">

        {/* Row 1: Selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-label text-[10px] uppercase tracking-widest text-on-background/40 whitespace-nowrap">
            Target
          </span>
          <select
            value={targetNode}
            onChange={(e) => setTargetNode(e.target.value)}
            disabled={loading || events.length === 0}
            className={`${selectCls} flex-1 max-w-[240px]`}
          >
            <option value="">— select node —</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id} className="bg-background">
                {evt.id}  {evt.label}
              </option>
            ))}
          </select>

          <span className="font-label text-[10px] uppercase tracking-widest text-on-background/40 whitespace-nowrap">
            Action
          </span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            disabled={loading}
            className={`${selectCls} w-[210px]`}
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-background">
                {opt.label}
              </option>
            ))}
          </select>

          {(targetNode || action) && (
            <span className="font-label text-[10px] text-secondary/70 truncate max-w-[180px]">
              {targetNode && `${targetNode}`}{targetNode && action && ' · '}{action && action.toUpperCase()}
            </span>
          )}
        </div>

        {/* Row 2: Text input + buttons */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={
              loading ? '' :
              targetNode || action
                ? 'Describe diagnosis and proposed fix…'
                : 'Enter directive or select node/action above…'
            }
            className="flex-1 bg-transparent text-on-background font-body text-sm py-1
                       border-b-2 border-on-background/20 focus:outline-none
                       focus:border-on-background/60 placeholder:text-on-background/25
                       disabled:opacity-40 transition-colors"
            autoFocus
          />

          <button
            onClick={resetGame}
            disabled={loading}
            className="font-label text-[10px] uppercase tracking-widest text-on-background/40
                       hover:text-on-background transition-colors disabled:opacity-30 flex-shrink-0
                       border border-on-background/20 px-3 py-1.5 hover:border-on-background/60 -rotate-1"
          >
            Reset
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-secondary-container text-white px-6 py-2 flex items-center gap-2
                       font-label text-[0.6875rem] font-bold uppercase rotate-1
                       hover:scale-105 active:scale-95 transition-all shadow-md
                       disabled:opacity-30 disabled:scale-100 flex-shrink-0"
          >
            <span className="material-symbols-outlined"
                  style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
              publish
            </span>
            Submit Patch
          </button>
        </div>
      </div>
    </footer>
  )
}
