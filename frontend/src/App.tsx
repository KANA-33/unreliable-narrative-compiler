import { useGameStore } from './store/gameStore'
import StartScreen from './components/StartScreen'
import GameScreen from './components/GameScreen'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  return screen === 'game' ? <GameScreen /> : <StartScreen />
}
