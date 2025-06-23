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
  const { setPlayers, setPhase, setKeyword, setScores, setWinner, setTimeLeft, setAIEvaluation } = useGameStore()
  
  // 타이머 관리를 위한 ref 사용
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastPhaseRef = useRef<string>("")
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
        } else if (currentState.currentPhase === "drawing") {
          // 캔버스 데이터가 없어도 시간이 끝나면 제출 처리
          console.log("Time's up! No canvas data, but forcing submission...")
          currentState.submitDrawing("")
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

  const connectSSE = () => {
    if (!roomId) return null

    const eventSource = new EventSource(`/api/events/${roomId}`)

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log("SSE Connected")
      // 재연결 타이머 정리
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("SSE Event received:", data)

        if (data.type === "game_state") {
          // 플레이어 상태 업데이트
          if (data.players) {
            console.log("Updating players from game state:", data.players)
            setPlayers(data.players)
          }

          // 게임 상태 업데이트
          if (data.room) {
            console.log("Room status:", data.room.status)
            const currentPhase = data.room.status === "waiting" ? "lobby" : 
                               data.room.status === "playing" ? "drawing" :
                               data.room.status === "scoring" ? "scoring" : 
                               data.room.status === "finished" ? "result" : "lobby"
            
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
            } else if (latestEvent.event_type === "next_round_started") {
              // 다음 라운드 시작 이벤트 처리
              const eventData = JSON.parse(latestEvent.event_data || "{}")
              console.log("Processing next_round_started event:", eventData)
              setPhase("drawing")
              setKeyword(eventData.keyword)
              setTimeLeft(60)
              startGameTimer() // 타이머 시작
              console.log("Next round started via SSE:", eventData)
            } else if (latestEvent.event_type === "round_completed") {
              const eventData = JSON.parse(latestEvent.event_data)
              console.log("🎊 라운드 완료 이벤트 처리:", eventData)
              
              setScores(eventData.scores || {})
              setWinner(eventData.winner || null)
              setAIEvaluation(eventData.aiEvaluation || null)
              setPhase("result")
              clearGameTimer()
              
              console.log("✅ 게임 상태 업데이트 완료: result 화면으로 전환")
            } else if (latestEvent.event_type === "host_left") {
              // 방장이 나간 경우 - 홈으로 이동
              console.log("Host left the room, redirecting to home")
              const eventData = JSON.parse(latestEvent.event_data || "{}")
              console.log("Host left event data:", eventData)
              
              if (eventData.roomDeleted) {
                // 방이 삭제된 경우 - 홈으로 이동
                const currentState = useGameStore.getState()
                currentState.resetGame()
                window.location.href = "/"
              }
            } else if (latestEvent.event_type === "host_transferred") {
              // 방장이 위임된 경우
              const eventData = JSON.parse(latestEvent.event_data || "{}")
              console.log("Host transferred event data:", eventData)
              
              const currentState = useGameStore.getState()
              console.log("Current player ID:", currentState.playerId)
              console.log("New host ID:", eventData.newHostId)
              
              if (currentState.playerId === eventData.newHostId) {
                // 내가 새로운 방장이 된 경우
                console.log("I am the new host!")
                currentState.setIsHost(true)
              }
            } else if (latestEvent.event_type === "host_assigned") {
              // 자동으로 방장이 설정된 경우
              const eventData = JSON.parse(latestEvent.event_data || "{}")
              console.log("Host assigned event data:", eventData)
              
              const currentState = useGameStore.getState()
              console.log("Current player ID:", currentState.playerId)
              console.log("Assigned host ID:", eventData.newHostId)
              
              if (currentState.playerId === eventData.newHostId) {
                // 내가 자동으로 방장이 된 경우
                console.log("I am the auto-assigned host!")
                currentState.setIsHost(true)
              }
            }
          }
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      console.log("SSE Error, attempting to reconnect...")
      
      // 재연결 시도
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Attempting to reconnect SSE...")
        connectSSE()
      }, 3000)
    }

    return eventSource
  }

  useEffect(() => {
    const eventSource = connectSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      setIsConnected(false)
      clearGameTimer()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [roomId, setPlayers, setPhase, setKeyword, setScores, setWinner, setTimeLeft])

  return { isConnected }
}
