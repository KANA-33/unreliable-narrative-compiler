import { useState, type KeyboardEvent } from 'react'
import { useGameStore } from '../store/gameStore'

export default function PatchCommandBar() {
  const selectedEventId = useGameStore((s) => s.selectedEventId)
  const isPatching      = useGameStore((s) => s.isPatching)
  const patchError      = useGameStore((s) => s.patchError)
  const submitPatch     = useGameStore((s) => s.submitPatch)
  const clearPatchError = useGameStore((s) => s.clearPatchError)

  const [input, setInput] = useState('')

  const hasTarget   = !!selectedEventId
  const inputsDisabled  = !hasTarget || isPatching
  const canSubmit   = hasTarget && !isPatching && input.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    const text = input.trim()
    setInput('')
    await submitPatch(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <footer
      className="fixed bottom-0 inset-x-0 z-50 border-t-2 border-stone-800
                 shadow-[0_-4px_12px_rgba(40,25,5,0.28)] font-body"
      style={{
        backgroundColor: '#ede0bf',
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.22 0 0 0 0 0.1 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E\"), linear-gradient(180deg, #f2e5c4 0%, #e3d2a6 100%)",
        backgroundSize: '200px 200px, 100% 100%',
      }}
    >
      {/* Error banner */}
      {patchError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-6 py-1.5
                     bg-red-900/90 text-red-50 font-label text-[11px] uppercase tracking-wider
                     border-b border-red-950"
        >
          <span>
            <span className="opacity-60 mr-2">[ERROR]</span>
            {patchError}
          </span>
          <button
            onClick={clearPatchError}
            className="font-bold opacity-70 hover:opacity-100 px-2 leading-none"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="px-6 py-3 flex items-center gap-4">

        {/* Prompt glyph */}
        <span className="font-label text-xs text-stone-800 font-bold select-none">
          <span className={isPatching ? 'animate-pulse' : ''}>›</span>
        </span>

        {/* Target readout */}
        <div
          className={`font-label text-[11px] uppercase tracking-widest px-2 py-1
                      border border-stone-800 bg-stone-50 text-stone-800 whitespace-nowrap
                      ${hasTarget ? '' : 'opacity-40 italic'}`}
          aria-label="Patch target"
        >
          <span className="opacity-50 mr-1">TARGET:</span>
          <span className="font-bold">
            {selectedEventId ?? '— none —'}
          </span>
        </div>

        {/* Input — bottom-line style */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={inputsDisabled}
          placeholder={
            !hasTarget     ? 'Select a target node to begin…' :
            isPatching     ? 'Awaiting compiler response…' :
                             'Describe your fix, then press Enter…'
          }
          className="flex-1 bg-transparent text-stone-900 text-sm py-1 px-1
                     border-0 border-b border-stone-800 rounded-none
                     focus:outline-none focus:border-b-2 focus:border-stone-900
                     placeholder:text-stone-500 placeholder:italic
                     disabled:text-stone-400 disabled:border-stone-400
                     disabled:bg-stone-200/40 disabled:cursor-not-allowed
                     transition-colors"
        />

        {/* Submit button — stamped rectangle */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`font-label text-[11px] font-bold uppercase tracking-widest
                      px-5 py-2 border-2 border-stone-800 select-none
                      transition-all whitespace-nowrap
                      ${canSubmit
                        ? 'bg-stone-800 text-stone-100 hover:bg-stone-900 active:translate-y-[1px] cursor-pointer'
                        : 'bg-stone-200 text-stone-500 border-stone-500 opacity-60 cursor-not-allowed'}
                      ${isPatching ? 'animate-pulse' : ''}`}
          aria-busy={isPatching}
        >
          {isPatching ? 'PROCESSING…' : 'SUBMIT PATCH'}
        </button>
      </div>
    </footer>
  )
}
