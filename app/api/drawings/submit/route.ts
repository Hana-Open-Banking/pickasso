import { type NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function POST(request: NextRequest) {
  try {
    const { playerId, roomId, canvasData } = await request.json()

    console.log("Submit drawing request:", { playerId, roomId, canvasDataLength: canvasData?.length || 0 })

    if (!playerId || !roomId) {
      console.error("Missing required fields:", { playerId, roomId })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    GameManager.submitDrawing(playerId, roomId, canvasData || "")
    GameManager.addGameEvent(roomId, "drawing_submitted", { playerId })

    // 모든 플레이어가 제출했는지 확인
    const players = GameManager.getRoomPlayers(roomId)
    const allSubmitted = players.every((p) => p.has_submitted)
    
    console.log("All players submitted check:", {
      totalPlayers: players.length,
      submittedPlayers: players.filter(p => p.has_submitted).length,
      allSubmitted
    })

    if (allSubmitted) {
      console.log("All players submitted, starting scoring...")
      // 자동 채점 시작
      const scores = GameManager.scoreDrawings(roomId)
      const winner = GameManager.getWinner(roomId)
      
      console.log("Scoring completed:", { scores, winner })

      GameManager.addGameEvent(roomId, "round_completed", { scores, winner })

      return NextResponse.json({
        success: true,
        allSubmitted: true,
        scores,
        winner,
      })
    }

    return NextResponse.json({ success: true, allSubmitted: false })
  } catch (error) {
    console.error("Error submitting drawing:", error)
    return NextResponse.json({ error: "Failed to submit drawing" }, { status: 500 })
  }
}
