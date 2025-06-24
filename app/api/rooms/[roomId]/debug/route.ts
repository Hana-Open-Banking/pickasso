import { NextRequest, NextResponse } from 'next/server'
import { GameManager } from '@/lib/game-manager'
import db, { type GameEvent } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const roomId = params.roomId

    // 방 상태 확인
    const room = GameManager.getRoom(roomId)

    // 플레이어 상태 확인
    const players = GameManager.getRoomPlayers(roomId)

    // 그림 데이터 확인
    const drawingsResult = db.prepare(`
      SELECT id, player_id, round_number, LENGTH(canvas_data) as canvas_length, keyword, score
      FROM drawings 
      WHERE room_id = ?
      ORDER BY submitted_at DESC
    `).all(roomId)

    // Ensure drawings is an array of Drawing objects
    const drawings = Array.isArray(drawingsResult) ? drawingsResult as any[] : []

    // 게임 이벤트 확인
    const events = db.prepare(`
      SELECT * FROM game_events WHERE room_id = ?
    `).all(roomId) as GameEvent[]

    // 🔍 메모리 상태 직접 확인
    // Define a type for the global object with custom properties
    const globalThis = global as {
      __gameEvents?: Map<number, GameEvent>;
      __eventIdCounter?: number;
    }
    const memoryEvents = globalThis.__gameEvents || new Map()
    const memoryEventsList = Array.from(memoryEvents.values()).filter((e: GameEvent) => e.room_id === roomId)
    console.log(`🔍 Memory events for room ${roomId}:`, memoryEventsList.length)

    // round_completed 이벤트의 실제 데이터 확인 (최신 이벤트 사용)
    const roundCompletedEvent = events.filter((e) => e.event_type === 'round_completed')[0]

    let roundCompletedData = null
    if (roundCompletedEvent?.event_data) {
      try {
        roundCompletedData = JSON.parse(roundCompletedEvent.event_data)
      } catch (error: unknown) {
        console.error('Failed to parse round_completed data:', error)
      }
    }

    return NextResponse.json({
      room,
      players: players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        is_host: p.is_host,
        has_submitted: p.has_submitted,
        score: p.score
      })),
      drawings: drawings ? drawings.map(d => ({
        id: d.id,
        player_id: d.player_id,
        round_number: d.round_number,
        canvas_length: d.canvas_length,
        keyword: d.keyword,
        score: d.score
      })) : [],
      events: events.map((e) => ({
        id: e.id,
        event_type: e.event_type,
        data_length: e.event_data?.length || 0,
        created_at: e.created_at,
        has_data: !!e.event_data
      })),
      memoryStatus: {
        totalMemoryEvents: memoryEvents.size,
        roomMemoryEvents: memoryEventsList.length,
        memoryEventTypes: memoryEventsList.map((e: GameEvent) => e.event_type),
        eventIdCounter: globalThis.__eventIdCounter || 0
      },
      roundCompletedData: roundCompletedData ? {
        hasScores: !!roundCompletedData.scores,
        hasWinner: !!roundCompletedData.winner,
        hasAiEvaluation: !!roundCompletedData.aiEvaluation,
        aiEvaluationKeys: roundCompletedData.aiEvaluation ? Object.keys(roundCompletedData.aiEvaluation) : [],
        scoresCount: roundCompletedData.scores ? Object.keys(roundCompletedData.scores).length : 0,
        winnerId: roundCompletedData.winner?.id,
        completedAt: roundCompletedData.completedAt
      } : null
    })
  } catch (error: unknown) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const roomId = params.roomId
    const body = await request.json()

    if (body.action === 'recreate_test_data') {
      console.log(`🔧 Recreating test data for room ${roomId}`)

      // 테스트용 AI 평가 데이터 생성
      const testAiEvaluation = {
        rankings: [
          { rank: 1, playerId: '1750664240682', score: 84 },
          { rank: 2, playerId: '1750664248192', score: 63 }
        ],
        comments: [
          { playerId: '1750664240682', comment: "꽃을 주제로 한 멋진 작품이었어요! 색감과 구성이 매우 우수합니다. 🌸" },
          { playerId: '1750664248192', comment: "꽃의 형태가 잘 표현되었고, 창의적인 접근이 돋보입니다! 🌺" }
        ],
        summary: `이번 라운드는 "꽃"을 주제로 2명이 참여했습니다. 모든 작품에서 각자의 창의성과 개성이 잘 드러났으며, 주제를 나름대로 해석한 다양한 접근 방식이 인상적이었습니다! 🌟`,
        evaluationCriteria: "주제 연관성 50%, 창의성 30%, 완성도 20% 기준으로 평가했습니다."
      }

      // round_completed 이벤트 재생성
      GameManager.addGameEvent(roomId, "round_completed", {
        scores: { '1750664240682': 84, '1750664248192': 63 },
        winner: { id: '1750664240682', nickname: 'ㅁㄴㅇㄹ' },
        aiEvaluation: testAiEvaluation,
        completedAt: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'Test data recreated',
        testData: testAiEvaluation
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: unknown) {
    console.error('Debug POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process debug action' },
      { status: 500 }
    )
  }
} 
