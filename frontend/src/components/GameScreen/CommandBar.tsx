import { useState, type KeyboardEvent } from 'react'
import { useGameStore } from '../../store/gameStore'

export default function CommandBar() {
  const { sendMessage, resetGame, loading } = useGameStore()
  const [input, setInput] = useState('')

  const handleSubmit = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <footer className="fixed bottom-0 w-full z-50 h-16 bg-[#131313] border-t border-[#474747]/20 flex items-center px-8 gap-4"
            style={{ boxShadow: '0 -10px 30px rgba(0,0,0,0.9)' }}>

      {/* Input takes all space on the left */}
      <input
        id="inp"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        placeholder={loading ? '' : 'Enter directive…'}
        className="flex-1 bg-transparent text-on-surface font-body text-sm py-1 border-b border-outline-variant/30 focus:outline-none focus:border-primary placeholder:text-outline-variant/30 disabled:opacity-40 transition-colors"
        autoFocus
      />

      {/* Reset */}
      <button
        onClick={resetGame}
        disabled={loading}
        className="font-label text-[10px] uppercase tracking-widest text-outline hover:text-white transition-colors disabled:opacity-30"
      >
        RESET
      </button>

      {/* Submit Patch — primary action, matches original design */}
      <button
        onClick={handleSubmit}
        disabled={loading || !input.trim()}
        className="bg-white text-[#131313] px-6 h-10 flex items-center gap-2 font-label text-[0.6875rem] font-bold uppercase hover:invert transition-all duration-100 active:scale-[0.98] disabled:opacity-30"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
          publish
        </span>
        <span>Submit Patch</span>
      </button>
    </footer>
  )
}
