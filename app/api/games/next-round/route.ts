import { type NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function POST(request: NextRequest) {
  try {
    const { roomId, hostId } = await request.json()

    if (!roomId || !hostId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 호스트 권한 확인
    const players = GameManager.getRoomPlayers(roomId)
    const host = players.find((p) => p.id === hostId && p.is_host)

    if (!host) {
      return NextResponse.json({ error: "Only host can start next round" }, { status: 403 })
    }

    const keyword = GameManager.nextRound(roomId)

    if (!keyword) {
      return NextResponse.json({ error: "Failed to start next round" }, { status: 500 })
    }

    GameManager.addGameEvent(roomId, "next_round_started", { keyword })

    return NextResponse.json({ success: true, keyword })
  } catch (error) {
    console.error("Error starting next round:", error)
    return NextResponse.json({ error: "Failed to start next round" }, { status: 500 })
  }
}
