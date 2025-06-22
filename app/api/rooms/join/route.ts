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

    // 방이 삭제되었는지 확인 (플레이어가 없는 경우)
    const currentPlayers = GameManager.getRoomPlayers(roomId)
    if (currentPlayers.length === 0) {
      console.log(`Room ${roomId} has no players, deleting room`)
      GameManager.deleteRoom(roomId)
      return NextResponse.json(
        { error: "Room has been deleted. Please create a new room." },
        { status: 400 }
      )
    }

    // 방장이 없는 경우 새로운 방장 선택
    const hasHost = currentPlayers.some(p => p.is_host)
    if (!hasHost && currentPlayers.length > 0) {
      console.log(`No host in room ${roomId}, selecting new host`)
      const newHostId = GameManager.findNewHost(roomId)
      if (newHostId) {
        GameManager.transferHost(roomId, newHostId)
        const newHost = currentPlayers.find(p => p.id === newHostId)
        console.log(`New host selected: ${newHostId} (${newHost?.nickname})`)
        
        // 새로운 방장에게 알림 이벤트 추가
        GameManager.addGameEvent(roomId, "host_transferred", { 
          oldHostId: "system", 
          newHostId, 
          newHostNickname: newHost?.nickname 
        })
      }
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
