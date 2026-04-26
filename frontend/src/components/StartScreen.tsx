import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import SettingsMenu from './SettingsMenu'

export default function StartScreen() {
  const { setScreen, initGame } = useGameStore()
  const [imgFailed, setImgFailed] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const handleStart = async () => {
    if (leaving) return
    setLeaving(true)
    await new Promise((r) => setTimeout(r, 350))
    await initGame()
    setScreen('game')
  }

  return (
    <div className={`fixed inset-0 z-[200] notebook-bg overflow-hidden relative paper-grain ${leaving ? 'leaving' : ''}`}>

      {/* Spine shadow for open-notebook look */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none opacity-20"
           style={{ boxShadow: 'inset 10px 0 15px -5px rgba(0,0,0,0.15), inset -10px 0 15px -5px rgba(0,0,0,0.15)' }} />

      {/* Top nav */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-4
                      border-b-2 border-dashed border-on-background/20 bg-background/90 backdrop-blur-sm">
        <div className="text-xl font-headline italic text-on-background underline decoration-wavy">
          THE_LIVING_DOSSIER
        </div>
        <div className="flex items-center gap-6">
          <SettingsMenu iconSize={20} />
        </div>
      </nav>

      {/* Main canvas */}
      <main className="relative w-full h-screen flex items-center justify-center p-4 md:p-16 overflow-hidden pt-16">

        {/* Floating polaroid — top right */}
        <div className="absolute top-20 right-16 hidden md:block -rotate-12 z-10">
          {!imgFailed ? (
            <div className="border-4 border-white shadow-xl w-32 h-32 overflow-hidden grayscale sepia brightness-90">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzJzvdmtVXOUN490t3LEaK1K72XiWJXNX6yotYQqkiu2gLeE5j43_as2iOuFZ969kOefoeEH35t657fvQrV26qZ2KRCF7z62kMmxrr60tpj_MQKQRo45jMXYkwOQRHOBI-nL4wAk6BdeZV6TS0b7viZm9A_P1ss9ur2fEvspzqKLEdEv7-BxwPP362qKRM7jGfyqaOVkAMZ5FtVLXux-fop-ctFhnKAKGv-00Jq-YiEFO8EEHANOMexqkBEc94XjhQV6FvjmJLX7Gw"
                alt="Evidence"
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            </div>
          ) : (
            <div className="border-4 border-white shadow-xl w-32 h-32 bg-surface-container-high
                            flex items-center justify-center text-outline/40 font-label text-[10px]">
              [PHOTO]
            </div>
          )}
        </div>

        {/* Field notes — bottom left */}
        <div className="absolute bottom-24 left-10 hidden md:block rotate-3 opacity-80 z-10">
          <div className="w-40 bg-surface-container-highest border border-on-background/10 p-3 text-[10px] font-label leading-none shadow-md">
            <p className="mb-1 border-b border-on-background/20 pb-1 font-bold">NOTES_FIELD_04</p>
            <p className="text-on-background/60 italic leading-tight">
              Evidence suggests the narrator is intentionally omitting the presence of the [REDACTED] in the hallway. Why?
            </p>
          </div>
        </div>

        {/* Central dossier folder */}
        <div className="relative z-10 w-full max-w-2xl bg-surface-container-low shadow-2xl p-10 md:p-16
                        border border-on-background/10 -rotate-1 transition-all duration-700 hover:rotate-0
                        flex flex-col items-center text-center" style={{ minHeight: '480px' }}>

          {/* Folder tab */}
          <div className="absolute -top-9 left-10 h-9 w-44 bg-surface-container-low
                          border-t border-x border-on-background/10 rounded-t-lg flex items-center px-4">
            <span className="font-label text-[10px] tracking-widest text-on-background/40 uppercase">
              FILE_REF: 091-UN
            </span>
          </div>

          {/* Header metadata */}
          <div className="w-full flex justify-between items-start opacity-50 mb-8">
            <div className="text-left font-label text-[9px] uppercase tracking-tighter leading-tight">
              <p>Subject: Cognitive Dissonance</p>
              <p>Status: Unverified</p>
            </div>
            <div className="text-right font-label text-[9px] uppercase tracking-tighter leading-tight">
              <p>Date: [REDACTED]</p>
              <p>Location: Inner-Space</p>
            </div>
          </div>

          {/* Main title */}
          <div className="relative mb-10">
            <h1 className="font-headline text-6xl md:text-7xl font-black italic text-on-background
                           tracking-tighter leading-none ink-bleed">
              Unreliable<br />Narrative
            </h1>
            <div className="mt-4 h-[2px] w-full bg-on-background/80 -rotate-1" />
            <div className="mt-1 h-px w-3/4 mx-auto bg-on-background/50 rotate-1" />

            {/* Annotation sticky */}
            <div className="absolute -right-6 md:-right-20 top-0 rotate-12 bg-surface-container-highest
                            p-3 border border-on-background/10 shadow-lg max-w-[140px]">
              <p className="font-headline italic text-xs text-on-primary-container leading-tight">
                "The facts don't match the memory..."
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-5 items-center w-full max-w-xs">
            <button
              onClick={handleStart}
              className="group relative w-full py-4 bg-on-background text-surface font-label font-bold
                         tracking-[0.2em] uppercase hover:scale-105 active:scale-95 transition-all"
            >
              <span className="relative z-10">Initialize Sequence</span>
              <div className="absolute -inset-1 border-2 border-on-background/20 rounded-sm -rotate-1 pointer-events-none" />
            </button>

            <button
              onClick={handleStart}
              className="mt-2 font-headline italic text-on-background/40 hover:text-on-background
                         transition-colors flex items-center gap-2 group text-sm"
            >
              <span className="material-symbols-outlined text-sm group-hover:rotate-90 transition-transform"
                    style={{ fontSize: 14 }}>
                close
              </span>
              <span className="underline decoration-wavy">Abandon Protocol</span>
            </button>
          </div>

          {/* Confidential tape */}
          <div className="absolute bottom-10 -left-12 w-52 h-8 bg-on-background/90 mix-blend-multiply
                          rotate-45 pointer-events-none flex items-center justify-center">
            <span className="text-surface font-label text-[8px] tracking-[0.4em] font-bold">CONFIDENTIAL</span>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-label text-[10px]
                      tracking-widest text-on-background/30 uppercase">
          Click anywhere to initialize
        </p>
      </main>

      {/* Click anywhere fallback */}
      <div className="fixed inset-0 z-0" onClick={handleStart} />
    </div>
  )
}
