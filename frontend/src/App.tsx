import { useEffect, useRef } from 'react'
import { useGameStore } from './store/gameStore'
import StartScreen from './components/StartScreen'
import GameScreen from './components/GameScreen'
import EndingScreen from './components/EndingScreen'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  const restoreFromCache = useGameStore((s) => s.restoreFromCache)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    // Best-effort: if a recent (≤30 min) session is in localStorage, resume it
    // so a browser back/forward navigation doesn't wipe the player's choices.
    void restoreFromCache()
  }, [restoreFromCache])

  if (screen === 'ending') return <EndingScreen />
  if (screen === 'game') return <GameScreen />
  return <StartScreen />
}
