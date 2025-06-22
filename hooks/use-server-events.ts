"use client"

import { useEffect, useState, useRef } from "react"
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
  
  // 타이머 관리를 위한 ref 사용
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastPhaseRef = useRef<string>("")

  const startGameTimer = () => {
    // 기존 타이머가 있다면 정리
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
    }

    console.log("Starting game timer...")
    const timer = setInterval(() => {
      const currentState = useGameStore.getState()
      const currentTime = currentState.timeLeft
      console.log(`Timer tick: ${currentTime} -> ${currentTime - 1}`)
      
      if (currentTime > 0) {
        setTimeLeft(currentTime - 1)
      } else {
        clearInterval(timer)
        gameTimerRef.current = null
        // 시간 종료 시 자동 제출
        if (currentState.canvasData && currentState.currentPhase === "drawing") {
          console.log("Time's up! Auto-submitting drawing...")
          currentState.submitDrawing(currentState.canvasData)
        }
      }
    }, 1000)

    gameTimerRef.current = timer
  }

  const clearGameTimer = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
      console.log("Game timer cleared")
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
            const currentPhase = data.room.status === "waiting" ? "lobby" : 
                               data.room.status === "playing" ? "drawing" :
                               data.room.status === "scoring" ? "scoring" : "result"
            
            // 상태가 변경되었을 때만 처리
            if (lastPhaseRef.current !== currentPhase) {
              console.log(`Phase changed: ${lastPhaseRef.current} -> ${currentPhase}`)
              lastPhaseRef.current = currentPhase
              setPhase(currentPhase)
              
              if (currentPhase === "drawing") {
                if (data.room.current_keyword) {
                  setKeyword(data.room.current_keyword)
                }
                if (data.room.time_left) {
                  setTimeLeft(data.room.time_left)
                }
                // drawing 단계로 변경되었을 때만 타이머 시작
                startGameTimer()
              } else {
                // 다른 단계로 변경되었을 때 타이머 정리
                clearGameTimer()
              }
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
