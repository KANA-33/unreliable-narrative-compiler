import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

const IMAGE_ANIM_MS = 6000

export default function EndingScreen() {
  const { totalScore, setScreen } = useGameStore()
  const [animDone, setAnimDone] = useState(false)
  const [imgError, setImgError] = useState(false)

  // Score → ending bucket. The backend's /api/ending/<key> route looks up
  // <key>.<ext> in backend/endings/, so dropping in positive.jpg / zero.jpg /
  // negative.jpg (or .png/.webp/.gif) is enough to wire up the visuals.
  // Falls back to default.jpg if a bucket image is missing.
  const outcome =
    totalScore > 0 ? 'positive' : totalScore < 0 ? 'negative' : 'zero'

  useEffect(() => {
    const t = setTimeout(() => setAnimDone(true), IMAGE_ANIM_MS)
    return () => clearTimeout(t)
  }, [])

  const handleClick = () => {
    if (animDone) setScreen('start')
  }

  return (
    <div
      onClick={handleClick}
      className={`fixed inset-0 z-[400] bg-black overflow-hidden select-none
                  ${animDone ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {!imgError && (
        <img
          src={`/api/ending/${outcome}`}
          alt=""
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover ending-image-anim
                     origin-center pointer-events-none"
        />
      )}

      {animDone && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-headline italic text-white/95 text-7xl md:text-8xl
                             tracking-[0.4em] ending-text-anim drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              END
            </span>
          </div>
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 font-label text-[11px]
                        tracking-widest text-white/50 uppercase ending-text-anim pointer-events-none">
            Tap anywhere to return
          </p>
        </>
      )}
    </div>
  )
}
