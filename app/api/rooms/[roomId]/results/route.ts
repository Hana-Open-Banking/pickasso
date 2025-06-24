import type { NextRequest } from "next/server"
import db, { type Room, type Player, type GameEvent } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const roomId = params.roomId
    console.log("🔍 Getting results for room:", roomId)

    // 방 정보 조회
    const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as Room
    if (!room) {
      return Response.json({ error: "Room not found" }, { status: 404 })
    }

    // 플레이어 목록 조회 (점수 포함)
    const players = db.prepare("SELECT * FROM players WHERE room_id = ?").all(roomId) as Player[]

    // 점수 객체 생성
    const scores: Record<string, number> = {}
    players.forEach(player => {
      scores[player.id] = player.score || 0
    })

    // 우승자 찾기
    const winner = players.reduce((prev, current) => 
      (prev.score || 0) > (current.score || 0) ? prev : current
    )

    // AI 평가 결과 조회 (가장 최근 것)
    let aiEvaluation = null
    try {
      console.log("🔍 Searching for AI evaluation in events...")

      // 먼저 모든 이벤트 조회
      const allEvents = db.prepare(`
        SELECT id, event_type, event_data, created_at 
        FROM game_events 
        WHERE room_id = ? 
        ORDER BY created_at DESC
      `).all(roomId) as GameEvent[]

      console.log("📊 All events for room:", allEvents.map(e => ({
        id: e.id,
        event_type: e.event_type,
        has_data: !!e.event_data,
        created_at: e.created_at
      })))

      // 최신 round_completed 이벤트 조회
      const aiResult = db.prepare(`
        SELECT id, event_data, created_at FROM game_events 
        WHERE room_id = ? AND event_type = 'round_completed' 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(roomId) as GameEvent

      console.log("🔍 AI result query:", {
        roomId,
        found: !!aiResult,
        eventId: aiResult?.id,
        createdAt: aiResult?.created_at,
        hasEventData: !!aiResult?.event_data
      })

      if (aiResult?.event_data) {
        console.log("🔍 Found round_completed event data (first 200 chars):", 
          aiResult.event_data.substring(0, 200) + '...')

        const eventData = JSON.parse(aiResult.event_data)
        aiEvaluation = eventData.aiEvaluation
        console.log("🤖 AI evaluation parsed:", {
          hasAiEvaluation: !!aiEvaluation,
          rankingsCount: aiEvaluation?.rankings?.length || 0,
          commentsCount: aiEvaluation?.comments?.length || 0
        })
      } else {
        console.log("🤖 No round_completed event found")
        console.log("🔍 Available event types:", [...new Set(allEvents.map(e => e.event_type))])
      }
    } catch (error: unknown) {
      console.error("Error parsing AI evaluation:", error)
    }

    const results = {
      room,
      players,
      scores,
      winner: winner || null,
      aiEvaluation
    }

    console.log("🎊 Returning results:", {
      roomStatus: room.status,
      playerCount: players.length,
      hasScores: Object.keys(scores).length > 0,
      hasWinner: !!winner,
      hasAiEvaluation: !!aiEvaluation
    })

    return Response.json(results)
  } catch (error: unknown) {
    console.error("Error getting room results:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
} 
