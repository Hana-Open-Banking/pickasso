import type { NextRequest } from "next/server";
import db, { type Room, type Player, type GameEvent } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const roomId = params.roomId;
  const { searchParams } = new URL(request.url);
  const lastEventId = parseInt(searchParams.get("lastEventId") || "0", 10);

  // Server-Sent Events 설정
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 초기 연결 메시지
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // 주기적으로 게임 상태 확인 및 전송
      const interval = setInterval(() => {
        try {
          // lastEventId 이후의 새로운 이벤트만 가져오기
          const events = db
            .prepare(
              `
            SELECT * FROM game_events 
            WHERE room_id = ? AND id > ?
            ORDER BY id DESC 
            LIMIT 10
          `
            )
            .all(roomId, lastEventId) as GameEvent[];

          // console.log(`📡 SSE: Room ${roomId} events query result:`, events)
          console.log(`📡 SSE: Events count:`, events?.length || 0);
          // console.log(`📡 SSE: Latest event:`, events?.[0])

          // 디버깅: 모든 이벤트 확인
          if (events && events.length > 0) {
            events.forEach((event, index) => {
              // console.log(`📡 SSE: Event ${index}:`, {
              //   id: event.id,
              //   room_id: event.room_id,
              //   event_type: event.event_type,
              //   has_event_data: !!event.event_data,
              //   event_data_length: event.event_data?.length || 0,
              //   event_data_preview: event.event_data?.substring(0, 100) + '...',
              //   created_at: event.created_at
              // })

              // round_completed 이벤트인 경우 상세 확인
              if (event.event_type === "round_completed" && event.event_data) {
                try {
                  const eventData = JSON.parse(event.event_data);
                  console.log(`📡 SSE: Round completed event details:`, {
                    hasScores: !!eventData.scores,
                    hasWinner: !!eventData.winner,
                    hasAiEvaluation: !!eventData.aiEvaluation,
                    aiEvaluationKeys: eventData.aiEvaluation
                      ? Object.keys(eventData.aiEvaluation)
                      : [],
                    aiRankingsCount:
                      eventData.aiEvaluation?.rankings?.length || 0,
                    aiCommentsCount:
                      eventData.aiEvaluation?.comments?.length || 0,
                    hasSummary: !!eventData.aiEvaluation?.summary,
                    hasEvaluationCriteria:
                      !!eventData.aiEvaluation?.evaluationCriteria,
                  });
                } catch (parseError: unknown) {
                  console.error(
                    `📡 SSE: Failed to parse round_completed event:`,
                    parseError
                  );
                }
              }
            });
          } else {
            console.log(`📡 SSE: No events found for room ${roomId}`);
            // 전체 이벤트 테이블 확인
            const allEvents = db
              .prepare(
                "SELECT id, room_id, event_type, created_at FROM game_events ORDER BY created_at DESC LIMIT 5"
              )
              .all();
            // console.log(`📡 SSE: Recent events in database:`, allEvents)
          }

          // 현재 방 상태 가져오기
          const room = db
            .prepare("SELECT * FROM rooms WHERE id = ?")
            .get(roomId) as Room;
          const players = db
            .prepare("SELECT * FROM players WHERE room_id = ?")
            .all(roomId) as Player[];

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
          //   is_host: p.is_host,
          //   has_submitted: p.has_submitted
          // })))

          const data = {
            type: "game_state",
            room,
            players,
            events,
          };

          // console.log(`📡 SSE: Sending data for room ${roomId}:`, {
          //   roomStatus: room?.status,
          //   playerCount: players?.length,
          //   eventCount: events?.length,
          //   latestEvent: events?.[0]?.event_type || 'none',
          //   latestEventData: events?.[0]?.event_data || 'none'
          // })

          // 새로운 이벤트가 있거나, 방/플레이어 정보가 필요한 경우에만 전송
          if (events.length > 0 || !lastEventId) { // 최초 연결 시에는 항상 전송
             controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } else {
            // 이벤트가 없을 때는 간단한 keep-alive 메시지만 보내서 연결 유지
            controller.enqueue(encoder.encode(`: keep-alive\n\n`));
          }
        } catch (error: unknown) {
          console.error("SSE Error:", error);
        }
      }, 2000); // 2초마다 업데이트

      // 연결 종료 시 정리
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
