"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useGameStore } from "@/store/game-store"
import LobbyScreen from "@/components/lobby-screen"
import GameScreen from "@/components/game-screen"
import ResultScreen from "@/components/result-screen"
import { mockSocket } from "@/utils/mock-socket"
import { useServerEvents } from "@/hooks/use-server-events"

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const { currentPhase, nickname, setRoomId } = useGameStore()
  const { isConnected } = useServerEvents(roomId)

  useEffect(() => {
    if (roomId && nickname) {
      setRoomId(roomId)
      // Mock socket connection
      mockSocket.connect(roomId, nickname)
    }
  }, [roomId, nickname, setRoomId])

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
      {currentPhase === "scoring" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">AI가 채점 중...</h2>
            <p className="text-gray-600">잠시만 기다려주세요</p>
          </div>
        </div>
      )}
      {currentPhase === "result" && <ResultScreen />}
    </div>
  )
}
