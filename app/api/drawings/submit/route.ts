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
    // has_submitted가 1, true, 또는 truthy 값인지 확인
    const allSubmitted = players.every((p) => p.has_submitted === 1 || p.has_submitted === true || p.has_submitted === '1')
    
    console.log("👥 플레이어 제출 상태 확인:")
    players.forEach(player => {
      console.log(`  Player ${player.id} (${player.nickname}): ${player.has_submitted ? '✅ 제출 완료' : '⏳ 대기 중'}`)
    })
    
    console.log("📊 제출 현황 요약:", {
      totalPlayers: players.length,
      submittedPlayers: players.filter(p => p.has_submitted).length,
      allSubmitted: allSubmitted,
      playersData: players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        has_submitted: p.has_submitted
      }))
    })

    if (allSubmitted) {
      console.log("🎯 모든 플레이어가 제출 완료, AI 채점 시작...")
      console.log("📊 채점 전 현황:", {
        roomId: roomId,
        totalPlayers: players.length,
        submittedPlayers: players.filter(p => p.has_submitted).length
      });
      
      try {
        // AI 자동 채점 시작
        console.log("🚀 GameManager.scoreDrawings 호출 시작");
        const { scores, evaluationResult } = await GameManager.scoreDrawings(roomId)
        console.log("🎊 GameManager.scoreDrawings 완료");
        
        const winner = GameManager.getWinner(roomId)
        
        console.log("✅ AI 채점 완료");
        console.log("📈 최종 점수:", scores);
        console.log("🏆 우승자:", winner);
        console.log("🤖 AI 평가 결과 요약:", {
          hasEvaluation: !!evaluationResult,
          rankingsCount: evaluationResult?.rankings?.length || 0,
          commentsCount: evaluationResult?.comments?.length || 0
        });
        
        if (evaluationResult) {
          console.log("🏅 순위별 결과:");
          evaluationResult.rankings.forEach(rank => {
            console.log(`  ${rank.rank}등: Player ${rank.playerId} (${rank.score}점)`);
          });
          
          console.log("💬 AI 코멘트:");
          evaluationResult.comments.forEach(comment => {
            console.log(`  Player ${comment.playerId}: ${comment.comment.substring(0, 50)}...`);
          });
        }

        // 게임 완료 이벤트 추가 (AI 평가 결과 포함)
        console.log("📝 게임 이벤트 추가 중...");
        GameManager.addGameEvent(roomId, "round_completed", { 
          scores, 
          winner,
          aiEvaluation: evaluationResult
        })
        console.log("📝 게임 이벤트 추가 완료");

        const responseData = {
          success: true,
          allSubmitted: true,
          scores,
          winner,
          aiEvaluation: evaluationResult
        };
        
        console.log("📤 클라이언트 응답 데이터:", {
          success: responseData.success,
          scoresCount: Object.keys(responseData.scores).length,
          winner: responseData.winner,
          hasAiEvaluation: !!responseData.aiEvaluation
        });

        return NextResponse.json(responseData)
      } catch (error) {
        console.error("💥 AI 채점 중 오류 발생:", error)
        console.error("🔍 오류 상세:", {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500)
        });
        
        // 오류 발생 시 기본 응답
        const fallbackResponse = {
          success: true,
          allSubmitted: true,
          scores: {},
          winner: null,
          error: "AI 평가 중 오류가 발생했습니다"
        };
        
        console.log("🔄 기본 응답 반환:", fallbackResponse);
        return NextResponse.json(fallbackResponse)
      }
    }

    return NextResponse.json({ success: true, allSubmitted: false })
  } catch (error) {
    console.error("Error submitting drawing:", error)
    return NextResponse.json({ error: "Failed to submit drawing" }, { status: 500 })
  }
}
