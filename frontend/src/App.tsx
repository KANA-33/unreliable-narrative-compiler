import { useGameStore } from './store/gameStore'
import StartScreen from './components/StartScreen'
import GameScreen from './components/GameScreen'
import EndingScreen from './components/EndingScreen'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  if (screen === 'ending') return <EndingScreen />
  if (screen === 'game') return <GameScreen />
  return <StartScreen />
}
