"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useGameStore } from "@/store/game-store"
import LobbyScreen from "@/components/lobby-screen"
import GameScreen from "@/components/game-screen"
import ResultScreen from "@/components/result-screen"
import { mockSocket } from "@/utils/mock-socket"
import { useServerEvents } from "@/hooks/use-server-events"

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { currentPhase, nickname, setRoomId, leaveRoom } = useGameStore()
  const { isConnected } = useServerEvents(roomId)

  console.log("🏠 RoomPage render:", { roomId, currentPhase, nickname, isConnected })
  console.log("🏠 Current game state:", useGameStore.getState())

  useEffect(() => {
    if (roomId && nickname) {
      setRoomId(roomId)
      // Mock socket connection
      mockSocket.connect(roomId, nickname)
      
      // 새로고침 시에만 방 재입장 시도
      const rejoinRoom = async () => {
        try {
          const currentState = useGameStore.getState()
          
          // 이미 방에 있는 경우는 재입장 시도하지 않음
          if (currentState.roomId === roomId && currentState.playerId) {
            console.log("Already in room, skipping rejoin")
            return
          }
          
          // 방장인 경우는 재입장 시도하지 않음 (방을 생성한 경우)
          if (currentState.isHost) {
            console.log("Host user, skipping rejoin")
            return
          }
          
          console.log("Attempting to rejoin room after refresh...")
          const response = await fetch('/api/rooms/join', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roomId,
              playerId: currentState.playerId || Date.now().toString(),
              nickname
            })
          })
          
          if (response.ok) {
            console.log("Successfully rejoined room after refresh")
          } else {
            console.log("Failed to rejoin room, redirecting to home")
            window.location.href = "/"
          }
        } catch (error) {
          console.error("Error rejoining room:", error)
          window.location.href = "/"
        }
      }
      
      // 페이지 로드 시 한 번만 실행
      rejoinRoom()
    }
  }, [roomId, nickname, setRoomId])

  // 창 닫기/뒤로가기 시 방 나가기 처리
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (roomId && nickname) {
        console.log("Window closing, leaving room...")
        event.preventDefault()
        event.returnValue = ""
        
        try {
          // store의 leaveRoom 함수 사용
          await useGameStore.getState().leaveRoom()
          console.log("Successfully left room")
        } catch (error) {
          console.error("Error leaving room:", error)
        }
      }
    }

    const handlePopState = async (event: PopStateEvent) => {
      if (roomId && nickname) {
        console.log("Back button pressed, leaving room...")
        try {
          // store의 leaveRoom 함수 사용
          await leaveRoom()
          console.log("Successfully left room, redirecting to home")
          window.location.href = "/"
        } catch (error) {
          console.error("Error leaving room:", error)
          window.location.href = "/"
        }
      }
    }

    // 페이지 로드 시 뒤로가기 감지를 위한 히스토리 상태 추가
    if (roomId && nickname) {
      window.history.pushState({ roomId, nickname }, '', window.location.href)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [roomId, nickname, leaveRoom])

  if (!isConnected || !nickname) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">서버에 연결 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentPhase === "lobby" && <LobbyScreen />}
      {currentPhase === "drawing" && <GameScreen />}
      {currentPhase === "scoring" && <GameScreen />}
      {currentPhase === "result" && <ResultScreen />}
    </div>
  )
}
