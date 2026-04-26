import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface Props {
  iconSize?: number
  className?: string
}

export default function SettingsMenu({ iconSize = 20, className = '' }: Props) {
  const { setScreen } = useGameStore()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleMainMenu = () => {
    setOpen(false)
    setScreen('start')
  }

  const handleSettings = () => {
    // intentionally empty — placeholder for future settings panel
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Open settings menu"
        aria-expanded={open}
        className="material-symbols-outlined text-on-background/70 hover:text-on-background
                   hover:rotate-45 transition-all cursor-pointer select-none"
        style={{ fontSize: iconSize }}
      >
        settings
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 z-[300] bg-surface-container-low
                     border border-on-background/20 shadow-xl py-1 -rotate-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleSettings}
            className="w-full text-left px-4 py-2 font-label text-xs uppercase tracking-widest
                       text-on-background/80 hover:bg-on-background hover:text-surface
                       transition-colors"
          >
            Settings
          </button>
          <div className="h-px bg-on-background/15 mx-2" />
          <button
            type="button"
            onClick={handleMainMenu}
            className="w-full text-left px-4 py-2 font-label text-xs uppercase tracking-widest
                       text-on-background/80 hover:bg-on-background hover:text-surface
                       transition-colors"
          >
            Main Menu
          </button>
        </div>
      )}
    </div>
  )
}
