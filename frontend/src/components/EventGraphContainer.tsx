import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import EventNodeGraph from './EventNodeGraph'

interface GraphNode {
  id: string
  label: string
  title: string
  status: 'idle' | 'active' | 'target' | 'error'
}

interface GraphEdge {
  sourceId: string
  targetId: string
  status: 'valid' | 'broken' | 'patching'
}

export default function EventGraphContainer() {
  const gameState       = useGameStore((s) => s.gameState)
  const selectedEventId = useGameStore((s) => s.selectedEventId)
  const patchingPath    = useGameStore((s) => s.patchingPath)

  // Still a placeholder — no "currently-executing" event concept yet.
  const activeEventId: string | null = null

  const { nodes, edges } = useMemo(() => {
    if (!gameState) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] }

    const targetEventId = selectedEventId
    const errorIds = new Set(gameState.errors.map((e) => e.event_id))

    const nodes: GraphNode[] = gameState.events.map((evt) => {
      let status: GraphNode['status'] = 'idle'
      if (evt.id === targetEventId)       status = 'target'
      else if (evt.id === activeEventId)  status = 'active'
      else if (errorIds.has(evt.id))      status = 'error'

      return {
        id:    evt.id,
        label: evt.id.replace(/^evt_/, 'NODE_').toUpperCase(),
        title: evt.label,
        status,
      }
    })

    const edges: GraphEdge[] = []
    for (let i = 0; i < gameState.events.length - 1; i++) {
      const sourceId = gameState.events[i].id
      const targetId = gameState.events[i + 1].id

      let status: GraphEdge['status'] = 'valid'
      if (patchingPath &&
          patchingPath.sourceId === sourceId &&
          patchingPath.targetId === targetId) {
        status = 'patching'
      } else if (errorIds.has(targetId)) {
        status = 'broken'
      }

      edges.push({ sourceId, targetId, status })
    }

    return { nodes, edges }
  }, [gameState, selectedEventId, activeEventId, patchingPath])

  if (!gameState) return null

  return <EventNodeGraph nodes={nodes} edges={edges} />
}
