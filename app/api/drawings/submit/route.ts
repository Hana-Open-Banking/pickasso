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
        // ✅ 개선: 모든 사용자에게 동일한 "처리 중" 응답 반환
        const processingResponse = {
          success: true,
          allSubmitted: true,
          processing: true,
          message: "🤖 AI가 작품을 평가하고 있습니다. 잠시만 기다려주세요!"
        };

        // 🔄 백그라운드에서 AI 평가 처리 (결과를 기다리지 않음)
        processAIEvaluationAsync(roomId).catch(error => {
          console.error("💥 백그라운드 AI 평가 실패:", error);
          // 실패 시에도 기본 결과 이벤트 발생
          GameManager.addGameEvent(roomId, "ai_evaluation_failed", { 
            error: error.message,
            fallbackUsed: true
          });
        });

        // ✅ 모든 사용자가 동일한 응답을 받음
        return NextResponse.json(processingResponse);
        
      } catch (error) {
        console.error("💥 AI 채점 준비 중 오류 발생:", error);
        return NextResponse.json({
          success: true,
          allSubmitted: true,
          error: "AI 평가 준비 중 오류가 발생했습니다"
        });
      }
    }

    return NextResponse.json({ success: true, allSubmitted: false })
  } catch (error) {
    console.error("Error submitting drawing:", error)
    return NextResponse.json({ error: "Failed to submit drawing" }, { status: 500 })
  }
}

// 🚀 비동기 AI 평가 처리 함수
async function processAIEvaluationAsync(roomId: string) {
  try {
    console.log("🚀 백그라운드 AI 평가 시작...");
    
    // 처리 중 상태를 모든 클라이언트에게 알림
    GameManager.addGameEvent(roomId, "ai_evaluation_started", {
      message: "AI 평가가 시작되었습니다.",
      startTime: new Date().toISOString()
    });

    // AI 평가 수행
    const { scores, evaluationResult } = await GameManager.scoreDrawings(roomId);
    const winner = GameManager.getWinner(roomId);
    
    console.log("✅ 백그라운드 AI 채점 완료");
    console.log("📈 최종 점수:", scores);
    console.log("🏆 우승자:", winner);
    
    // ✅ 핵심: 모든 클라이언트에게 동시에 결과 전달
    GameManager.addGameEvent(roomId, "round_completed", { 
      scores, 
      winner,
      aiEvaluation: evaluationResult,
      completedAt: new Date().toISOString()
    });
    
    console.log("📡 결과 이벤트 발송 완료 - 모든 클라이언트가 동시에 수신");
    
  } catch (error) {
    console.error("💥 백그라운드 AI 평가 실패:", error);
    
    // 실패 시 기본 결과로 대체
    const fallbackScores = await generateFallbackScores(roomId);
    const fallbackWinner = GameManager.getWinner(roomId);
    
    GameManager.addGameEvent(roomId, "round_completed", { 
      scores: fallbackScores, 
      winner: fallbackWinner,
      aiEvaluation: null,
      error: "AI 평가 실패, 기본 결과 적용",
      completedAt: new Date().toISOString()
    });
  }
}

// 기본 점수 생성 함수
async function generateFallbackScores(roomId: string): Promise<Record<string, number>> {
  const players = GameManager.getRoomPlayers(roomId);
  const scores: Record<string, number> = {};
  
  players.forEach(player => {
    scores[player.id] = Math.floor(Math.random() * 30) + 70; // 70-100점
  });
  
  return scores;
}
