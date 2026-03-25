import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { DialogueMessage } from '../../types'

function Message({ msg }: { msg: DialogueMessage }) {
  if (msg.role === 'operator') {
    return (
      <div className="flex gap-3">
        <span className="text-primary font-bold text-xs mt-0.5 flex-shrink-0">&gt;&gt;</span>
        <p className="text-xs leading-relaxed font-medium">{msg.text}</p>
      </div>
    )
  }
  if (msg.role === 'compiler') {
    return (
      <div className="flex gap-3">
        <span className="text-outline font-bold text-xs mt-0.5 flex-shrink-0">::</span>
        <p className={`text-xs italic text-outline leading-relaxed whitespace-pre-wrap ${msg.loading ? 'loading' : ''}`}>
          {msg.text}
        </p>
      </div>
    )
  }
  return (
    <div className="flex gap-3">
      <span className="text-outline-variant text-xs mt-0.5 flex-shrink-0 opacity-40">--</span>
      <p className="text-xs text-outline opacity-40 leading-relaxed">{msg.text}</p>
    </div>
  )
}

export default function DialoguePanel() {
  const { messages } = useGameStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <section className="flex-1 p-6 border-r border-outline-variant/10 flex flex-col overflow-hidden">
      <h4 className="font-label text-[10px] uppercase tracking-widest text-outline mb-4 flex-shrink-0">
        Compiler_Dialogue
      </h4>
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  )
}
