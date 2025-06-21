import { type NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function POST(request: NextRequest) {
  try {
    const { roomId, hostId } = await request.json()

    console.log(`Start game request: roomId=${roomId}, hostId=${hostId}`)

    if (!roomId || !hostId) {
      console.log("Missing required fields:", { roomId, hostId })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 호스트 권한 확인
    const players = GameManager.getRoomPlayers(roomId)
    console.log(`Room ${roomId} players:`, players.map(p => ({ id: p.id, nickname: p.nickname, is_host: p.is_host })))
    
    const host = players.find((p) => p.id === hostId && p.is_host)
    console.log(`Host check: looking for hostId=${hostId}, found:`, host ? 'YES' : 'NO')

    if (!host) {
      console.log(`Access denied: hostId=${hostId} is not the host of room ${roomId}`)
      return NextResponse.json({ error: "Only host can start the game" }, { status: 403 })
    }

    const keyword = GameManager.startGame(roomId)

    if (!keyword) {
      return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
    }

    GameManager.addGameEvent(roomId, "game_started", { keyword })

    console.log(`Game started successfully in room ${roomId} with keyword: ${keyword}`)
    return NextResponse.json({ success: true, keyword })
  } catch (error) {
    console.error("Error starting game:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}
