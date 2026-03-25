import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

const KEYS = Array.from({ length: 19 })

export default function StartScreen() {
  const { setScreen, initGame } = useGameStore()
  const [imgFailed, setImgFailed] = useState(false)

  const handleStart = async () => {
    const el = document.getElementById('start-screen')
    if (el) {
      el.classList.add('leaving')
      await new Promise((r) => setTimeout(r, 400))
    }
    await initGame()
    setScreen('game')
  }

  return (
    <div
      id="start-screen"
      className="fixed inset-0 z-[200] bg-black cursor-pointer"
      onClick={handleStart}
    >
      {/* Scanline texture only — no grain */}
      <div className="fixed inset-0 pointer-events-none scanline-overlay z-[9] opacity-20" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-8 flex justify-between items-start z-50 pointer-events-none">
        <div className="flex flex-col">
          <span className="font-headline font-bold text-2xl tracking-[0.2em] uppercase text-white">
            UNC_SYSTEM_v1.0
          </span>
          <span className="font-label text-outline text-[0.6rem] tracking-[0.3em] mt-1">
            STATUS: BUFFERING_NARRATIVE
          </span>
        </div>
        <div className="flex gap-4">
          <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>terminal</span>
          <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>settings</span>
        </div>
      </header>

      {/* Main */}
      <main className="relative h-full w-full flex flex-col items-center justify-center px-6 pt-24 pb-32 overflow-hidden">
        {/* Title */}
        <div className="mb-6 text-center animate-flicker flex-shrink-0">
          <h1 className="font-headline text-4xl md:text-6xl font-light tracking-tight text-white mb-2 leading-none">
            Unreliable Narrative <br />
            <span className="font-label tracking-[0.4em] text-primary-container opacity-60 text-lg md:text-xl">
              COMPILER
            </span>
          </h1>
          <div className="w-16 h-px bg-primary mx-auto mt-4 opacity-30" />
        </div>

        {/* Typewriter image */}
        <div className="relative w-full max-w-2xl flex-shrink-0" style={{ maxHeight: '55vh' }}>
          {!imgFailed ? (
            <img
              alt="Vintage Typewriter Artifact"
              className="w-full h-full object-contain pointer-events-none"
              style={{ maxHeight: '55vh' }}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5S39x_Os3DVBZT5vhtCjRYKAJv6vvayDsVMvOds6IHCJpQ-di0ggjmjwo1ZQyb3NGEOj3nEPvXSZ5dxstirgqW58Krl4Z9kvIzGpOW7aDmLJEJBVKmJv4x_yRE5YQ44oa1JQX8Gtbl8srgZQEBXtTYCa2YB9tk0jvuCurg_wXJBh2wOGoAjGo6Vjv195Rczv4IaOsBXiXWtFArZpSs5EujWwsye4ZBC6cFQBiLXS7bVKGmcasBvIfJK3MG-Atqc3GJ8I"
              onError={() => setImgFailed(true)}
            />
          ) : (
            /* Fallback: ASCII-art style typewriter placeholder */
            <div
              className="w-full flex items-center justify-center font-label text-outline opacity-30 select-none"
              style={{ maxHeight: '55vh', fontSize: '0.5rem', lineHeight: 1.4, letterSpacing: '0.05em' }}
            >
              <pre>{`
  ╔══════════════════════════════════════════╗
  ║  [Q][W][E][R][T][Y][U][I][O][P]          ║
  ║   [A][S][D][F][G][H][J][K][L]            ║
  ║    [Z][X][C][V][B][N][M]                 ║
  ║  [         SPACE BAR          ]          ║
  ╚══════════════════════════════════════════╝
              `}</pre>
            </div>
          )}

          {/* Interactive key grid overlay (only when image loaded) */}
          {!imgFailed && (
            <div className="absolute inset-0 pointer-events-auto">
              <div className="absolute top-[55%] left-[28%] w-[44%] h-[20%] grid grid-cols-10 gap-1">
                {KEYS.map((_, i) => (
                  <div
                    key={i}
                    className="key-target bg-white/0 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-full"
                  />
                ))}
              </div>
              <div className="absolute top-[76%] left-[38%] w-[24%] h-[4%] key-target bg-white/0 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-full" />
            </div>
          )}
        </div>

        {/* Side metadata */}
        <div className="absolute left-8 bottom-28 hidden lg:flex flex-col gap-2 border-l border-outline-variant/30 pl-4">
          <span className="font-label text-outline text-[0.6rem]">ID: REDACTED_77</span>
          <span className="font-label text-outline text-[0.6rem]">LOCATION: [UNDEFINED]</span>
          <span className="font-label text-outline text-[0.6rem]">TIMESTAMP: --:--:--</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-10 left-0 right-0 z-30 text-center pointer-events-none">
        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 bg-primary animate-pulse" />
          <p className="font-label tracking-[0.2em] text-on-surface-variant text-sm opacity-80 animate-flicker">
            Click Anywhere to Start
          </p>
          <div className="w-2 h-2 bg-primary animate-pulse" />
        </div>
        <div className="mt-3 flex justify-center gap-8 opacity-20">
          <span className="font-label text-[0.5rem] tracking-[0.1em]">VERSION_1.0.4_BETA</span>
          <span className="font-label text-[0.5rem] tracking-[0.1em]">© 1984_UNC_CORP</span>
        </div>
      </footer>

      {/* Vertical archive labels */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-12 pointer-events-none opacity-20">
        {['ARCHIVE_NO_092', 'ARCHIVE_NO_093', 'ARCHIVE_NO_094'].map((label) => (
          <span key={label} className="font-label text-xs [writing-mode:vertical-rl] rotate-180">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
