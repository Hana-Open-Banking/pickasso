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

  // ✅ 게임 결과 직접 조회 함수 추가
  const fetchGameResults = async (roomId: string) => {
    try {
      console.log("🔍 Fetching game results for room:", roomId)
      const response = await fetch(`/api/rooms/${roomId}/results`)
      if (response.ok) {
        const results = await response.json()
        console.log("🎊 Game results fetched:", results)
        
        if (results.aiEvaluation) {
          console.log("🤖 Setting AI evaluation:", results.aiEvaluation)
          console.log("🔄 Before setting AI evaluation from API, current state:", useGameStore.getState().aiEvaluation)
          setAIEvaluation(results.aiEvaluation)
          console.log("🔄 After setting AI evaluation from API, state should be:", results.aiEvaluation)
        }
        
        if (results.scores) {
          console.log("🏆 Setting scores:", results.scores)
          console.log("🔄 Before setting scores from API, current state:", useGameStore.getState().scores)
          setScores(results.scores)
          console.log("🔄 After setting scores from API, state should be:", results.scores)
        }
        
        if (results.winner) {
          console.log("👑 Setting winner:", results.winner)
          console.log("🔄 Before setting winner from API, current state:", useGameStore.getState().winner)
          setWinner(results.winner)
          console.log("🔄 After setting winner from API, state should be:", results.winner)
        }
      } else {
        console.error("Failed to fetch game results:", response.status)
      }
    } catch (error) {
      console.error("Error fetching game results:", error)
    }
  }

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
        console.log("📡 SSE Event received:", data)
        console.log("📡 Event type:", data.type)
        console.log("📡 Room data:", data.room)
        console.log("📡 Players data:", data.players)
        console.log("📡 Events data:", data.events)

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
              } else if (currentPhase === "result") {
                // ✅ 개선: finished 상태일 때 직접 결과 조회
                console.log("🎯 Room finished, fetching results directly...")
                fetchGameResults(roomId)
                clearGameTimer()
              } else {
                // 다른 단계로 변경되었을 때 타이머 정리
                clearGameTimer()
              }
            }
          }

          // 최근 이벤트 처리
          if (data.events && data.events.length > 0) {
            console.log("📨 Recent events:", data.events)
            const latestEvent = data.events[0]
            console.log("📨 Latest event:", latestEvent)
            console.log("📨 Event type:", latestEvent.event_type)
            console.log("📨 Event data raw:", latestEvent.event_data)
            
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
            } else if (latestEvent.event_type === "ai_evaluation_started") {
              const eventData = JSON.parse(latestEvent.event_data)
              console.log("🤖 AI 평가 시작 알림:", eventData)
              
              // 모든 사용자에게 동일한 처리 중 상태 표시
              setPhase("scoring")
              // UI에서 로딩 메시지 표시를 위한 상태 업데이트
              
            } else if (latestEvent.event_type === "round_completed") {
              try {
                const eventData = JSON.parse(latestEvent.event_data)
                console.log("🎊 라운드 완료 이벤트 처리 (모든 사용자 동시 수신):", eventData)
                console.log("🎊 Scores:", eventData.scores)
                console.log("🎊 Winner:", eventData.winner)
                console.log("🎊 AI Evaluation:", eventData.aiEvaluation)
                console.log("🎊 AI Rankings:", eventData.aiEvaluation?.rankings)
                console.log("🎊 AI Comments:", eventData.aiEvaluation?.comments)
                
                // ✅ 개선: 모든 사용자가 정확히 같은 시점에 결과 수신
                console.log("🔄 Before setting scores, current state:", useGameStore.getState().scores)
                setScores(eventData.scores || {})
                console.log("🔄 After setting scores, state should be:", eventData.scores || {})
                
                console.log("🔄 Before setting winner, current state:", useGameStore.getState().winner)
                setWinner(eventData.winner || null)
                console.log("🔄 After setting winner, state should be:", eventData.winner || null)
                
                console.log("🔄 Before setting AI evaluation, current state:", useGameStore.getState().aiEvaluation)
                setAIEvaluation(eventData.aiEvaluation || null)
                console.log("🔄 After setting AI evaluation, state should be:", eventData.aiEvaluation || null)
                
                setPhase("result")
                clearGameTimer()
                
                console.log("✅ 모든 사용자 동등한 게임 상태 업데이트 완료")
                console.log("✅ Updated game state:", {
                  scores: eventData.scores,
                  winner: eventData.winner,
                  aiEvaluation: eventData.aiEvaluation,
                  phase: "result"
                })
              } catch (parseError) {
                console.error("💥 round_completed 이벤트 파싱 오류:", parseError)
                console.error("💥 원본 이벤트 데이터:", latestEvent.event_data)
                // 파싱 실패 시에도 최소한 result 화면으로 전환
                setPhase("result")
                clearGameTimer()
              }
              
            } else if (latestEvent.event_type === "ai_evaluation_failed") {
              const eventData = JSON.parse(latestEvent.event_data)
              console.log("💥 AI 평가 실패 알림:", eventData)
              
              // 실패 시에도 모든 사용자에게 동일한 처리
              setPhase("result")
              // 오류 메시지 표시
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

    eventSource.onerror = (error) => {
      console.error("💥 SSE Error:", error)
      console.error("💥 SSE ReadyState:", eventSource.readyState)
      console.error("💥 SSE URL:", eventSource.url)
      setIsConnected(false)
      
      // 재연결 시도
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Attempting to reconnect SSE...")
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
