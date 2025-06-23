import type { NextRequest } from "next/server"
import db from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  const roomId = params.roomId

  // Server-Sent Events 설정
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // 초기 연결 메시지
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

      // 주기적으로 게임 상태 확인 및 전송
      const interval = setInterval(() => {
        try {
          // 최근 이벤트 가져오기
          const events = db
            .prepare(`
            SELECT * FROM game_events 
            WHERE room_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
          `)
            .all(roomId)

          console.log(`📡 SSE: Room ${roomId} events query result:`, events)
          console.log(`📡 SSE: Events count:`, events?.length || 0)
          console.log(`📡 SSE: Latest event:`, events?.[0])
          
          // 디버깅: 모든 이벤트 확인
          if (events && events.length > 0) {
            events.forEach((event, index) => {
              console.log(`📡 SSE: Event ${index}:`, {
                id: event.id,
                room_id: event.room_id,
                event_type: event.event_type,
                event_data: event.event_data,
                created_at: event.created_at
              })
            })
          } else {
            console.log(`📡 SSE: No events found for room ${roomId}`)
            // 전체 이벤트 테이블 확인
            const allEvents = db.prepare("SELECT * FROM game_events ORDER BY created_at DESC LIMIT 5").all()
            console.log(`📡 SSE: Recent events in database:`, allEvents)
          }

          // 현재 방 상태 가져오기
          const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as any
          const players = db.prepare("SELECT * FROM players WHERE room_id = ?").all(roomId) as any[]

          // console.log(`SSE: Room ${roomId} details:`, {
          //   id: room?.id,
          //   status: room?.status,
          //   current_keyword: room?.current_keyword,
          //   time_left: room?.time_left,
          //   round_number: room?.round_number
          // })

          // console.log(`SSE: Players in room ${roomId}:`, players.map(p => ({
          //   id: p.id,
          //   nickname: p.nickname,
          //   has_submitted: p.has_submitted,
          //   is_host: p.is_host
          // })))

          const data = {
            type: "game_state",
            room,
            players,
            events,
          }

          console.log(`📡 SSE: Sending data for room ${roomId}:`, {
            roomStatus: room?.status,
            playerCount: players?.length,
            eventCount: events?.length,
            latestEvent: events?.[0]?.event_type || 'none',
            latestEventData: events?.[0]?.event_data || 'none'
          })

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (error) {
          console.error("SSE Error:", error)
        }
      }, 2000) // 2초마다 업데이트

      // 연결 종료 시 정리
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
