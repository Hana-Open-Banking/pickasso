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

    const success = GameManager.joinRoom(roomId, playerId, nickname)

    if (!success) {
      const room = GameManager.getRoom(roomId)
      if (!room) {
        return NextResponse.json(
          { error: "Room not found. Please check the room code." },
          { status: 400 }
        )
      }
      
      if (room.status !== "waiting") {
        return NextResponse.json(
          { error: "Room is not accepting new players. Game may have already started." },
          { status: 400 }
        )
      }

      // 닉네임 중복 체크
      const players = GameManager.getRoomPlayers(roomId)
      const existingPlayer = players.find(p => p.nickname === nickname)
      if (existingPlayer) {
        return NextResponse.json(
          { error: "Nickname is already taken in this room. Please choose a different nickname." },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: "Failed to join room. Please try again." },
        { status: 400 }
      )
    }

    GameManager.addGameEvent(roomId, "player_joined", { playerId, nickname })

    const room = GameManager.getRoom(roomId)
    const players = GameManager.getRoomPlayers(roomId)

    console.log(`Successfully joined room ${roomId}. Total players: ${players.length}`)

    // 현재 사용자가 방장인지 확인
    const currentPlayer = players.find(p => p.id === playerId)
    const isHost = currentPlayer?.is_host || false

    return NextResponse.json({ 
      success: true, 
      room, 
      players,
      isHost 
    })
  } catch (error) {
    console.error("Error joining room:", error)
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
  }
}
