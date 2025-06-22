import { type NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId, nickname } = await request.json()

    console.log(`Join room request: roomId=${roomId}, playerId=${playerId}, nickname=${nickname}`)

    if (!roomId || !playerId || !nickname) {
      console.log("Missing required fields:", { roomId, playerId, nickname })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 방 존재 확인
    const room = GameManager.getRoom(roomId)
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // 방 입장 시도
    const joinSuccess = GameManager.joinRoom(roomId, playerId, nickname)
    
    if (!joinSuccess) {
      return NextResponse.json({ error: "Failed to join room" }, { status: 400 })
    }

    // 방장이 없는 경우 자동으로 방장 설정
    const players = GameManager.getRoomPlayers(roomId)
    const hasHost = players.some(p => p.is_host)
    
    if (!hasHost && players.length > 0) {
      console.log(`No host found in room ${roomId}, setting first player as host`)
      const firstPlayer = players[0]
      GameManager.transferHost(roomId, firstPlayer.id)
      
      // 방장 설정 이벤트 추가
      GameManager.addGameEvent(roomId, "host_assigned", {
        newHostId: firstPlayer.id,
        newHostNickname: firstPlayer.nickname,
        reason: "auto_assigned"
      })
      
      // 업데이트된 플레이어 목록 가져오기
      const updatedPlayers = GameManager.getRoomPlayers(roomId)
      const isHost = firstPlayer.id === playerId
      
      return NextResponse.json({
        success: true,
        isHost,
        players: updatedPlayers
      })
    }

    // 현재 플레이어가 방장인지 확인
    const currentPlayer = players.find(p => p.id === playerId)
    const isHost = currentPlayer?.is_host || false

    return NextResponse.json({
      success: true,
      isHost,
      players
    })
  } catch (error) {
    console.error("Error joining room:", error)
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
  }
}
