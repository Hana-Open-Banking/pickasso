import { type NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function POST(request: NextRequest) {
  try {
    const { hostId, nickname } = await request.json()

    console.log(`Creating room request: hostId=${hostId}, nickname=${nickname}`)

    if (!hostId || !nickname) {
      console.log("Missing required fields:", { hostId, nickname })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const roomId = GameManager.createRoom(hostId)
    console.log(`Room created: ${roomId}`)
    
    GameManager.addHost(roomId, hostId, nickname)
    console.log(`Host added to room: ${roomId}, hostId: ${hostId}, nickname: ${nickname}`)
    
    GameManager.addGameEvent(roomId, "room_created", { hostId, nickname })

    const room = GameManager.getRoom(roomId)
    const players = GameManager.getRoomPlayers(roomId)
    console.log(`Room ${roomId} created successfully. Players: ${players.length}`)

    // 방장 정보 반환
    const hostPlayer = players.find(p => p.id === hostId)

    return NextResponse.json({ 
      roomId, 
      success: true,
      hostPlayer,
      players 
    })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ error: "Room ID required" }, { status: 400 })
    }

    const room = GameManager.getRoom(roomId)
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const players = GameManager.getRoomPlayers(roomId)

    return NextResponse.json({ room, players })
  } catch (error) {
    console.error("Error getting room:", error)
    return NextResponse.json({ error: "Failed to get room" }, { status: 500 })
  }
}
