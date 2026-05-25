import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStore } from '../store'

export function useWorkspaceWebSocket(workspaceId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()
  const setLastEvent = useStore(s => s.setLastEvent)

  const connect = useCallback(() => {
    if (!workspaceId) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = import.meta.env.DEV ? '127.0.0.1:8000' : window.location.host
    const url = `${proto}://${host}/ws/${workspaceId}`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      // Heartbeat every 25s
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 25_000)
      ws.onclose = () => clearInterval(ping)
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        setLastEvent(data)
        if (data.event === 'usage_update' || data.event === 'backfill_complete') {
          // Invalidate all analytics queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['analytics'] })
          queryClient.invalidateQueries({ queryKey: ['usage'] })
          queryClient.invalidateQueries({ queryKey: ['balance'] })
        }
      } catch (_) { /* not JSON */ }
    }

    ws.onerror = () => ws.close()
    ws.onclose = () => {
      // Reconnect after 5s
      setTimeout(() => { if (workspaceId) connect() }, 5_000)
    }

    wsRef.current = ws
  }, [workspaceId, queryClient, setLastEvent])

  useEffect(() => {
    connect()
    return () => { wsRef.current?.close() }
  }, [connect])
}
