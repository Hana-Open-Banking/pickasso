"use client"

import { useEffect, useState } from "react"
import { useGameStore } from "@/store/game-store"

interface ServerEvent {
  type: string
  room?: any
  players?: any[]
  events?: any[]
}

export function useServerEvents(roomId: string) {
  const [isConnected, setIsConnected] = useState(false)
  const { setPlayers, setPhase, setKeyword, setScores, setWinner, setTimeLeft } = useGameStore()

  // 게임 타이머 관리
  const [gameTimer, setGameTimer] = useState<NodeJS.Timeout | null>(null)

  const startGameTimer = () => {
    // 기존 타이머가 있다면 정리
    if (gameTimer) {
      clearInterval(gameTimer)
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 0) {
          return prev - 1
        } else {
          clearInterval(timer)
          setGameTimer(null)
          // 시간 종료 시 자동 제출
          const currentState = useGameStore.getState()
          if (currentState.canvasData && currentState.currentPhase === "drawing") {
            currentState.submitDrawing(currentState.canvasData)
          }
          return 0
        }
      })
    }, 1000)

    setGameTimer(timer)
  }

  const clearGameTimer = () => {
    if (gameTimer) {
      clearInterval(gameTimer)
      setGameTimer(null)
    }
  }

  useEffect(() => {
    if (!roomId) return

    const eventSource = new EventSource(`/api/events/${roomId}`)

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log("SSE Connected")
    }

    eventSource.onmessage = (event) => {
      try {
        const data: ServerEvent = JSON.parse(event.data)
        console.log("SSE Event received:", data)

        if (data.type === "game_state") {
          // 플레이어 상태 업데이트
          if (data.players) {
            setPlayers(data.players)
          }

          // 게임 상태 업데이트
          if (data.room) {
            console.log("Room status:", data.room.status)
            switch (data.room.status) {
              case "waiting":
                setPhase("lobby")
                clearGameTimer()
                break
              case "playing":
                setPhase("drawing")
                if (data.room.current_keyword) {
                  setKeyword(data.room.current_keyword)
                }
                if (data.room.time_left) {
                  setTimeLeft(data.room.time_left)
                }
                // 방 상태가 playing으로 변경되었을 때 타이머 시작
                if (!gameTimer) {
                  startGameTimer()
                }
                break
              case "scoring":
                setPhase("scoring")
                clearGameTimer()
                break
            }
          }

          // 최근 이벤트 처리
          if (data.events && data.events.length > 0) {
            console.log("Recent events:", data.events)
            const latestEvent = data.events[0]
            console.log("Latest event:", latestEvent)
            
            if (latestEvent.event_type === "game_started") {
              // 게임 시작 이벤트 처리
              const eventData = JSON.parse(latestEvent.event_data || "{}")
              console.log("Processing game_started event:", eventData)
              setPhase("drawing")
              setKeyword(eventData.keyword)
              setTimeLeft(60)
              startGameTimer() // 타이머 시작
              console.log("Game started via SSE:", eventData)
            } else if (latestEvent.event_type === "round_completed") {
              const eventData = JSON.parse(latestEvent.event_data)
              setScores(eventData.scores)
              setWinner(eventData.winner)
              setPhase("result")
              clearGameTimer()
            }
          }
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      console.log("SSE Error")
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
      clearGameTimer()
    }
  }, [roomId, setPlayers, setPhase, setKeyword, setScores, setWinner, setTimeLeft])

  return { isConnected }
}
