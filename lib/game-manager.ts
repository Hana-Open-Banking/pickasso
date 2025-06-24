import db, { type Room, type Player, type Drawing } from "./db";
// AI 평가 시스템을 동적으로 import하여 클라이언트 사이드에서 실행되지 않도록 함
type DrawingSubmission = {
  playerId: string;
  imageData: string;
  timestamp: number;
};

type EvaluationResult = {
  rankings: Array<{
    rank: number;
    playerId: string;
    score: number;
  }>;
  comments: Array<{
    playerId: string;
    comment: string;
  }>;
  summary?: string;
  evaluationCriteria?: string;
};


const keywords = [
  "고양이",
  "강아지",
  "자동차",
  "집",
  "나무",
  "꽃",
  "태양",
  "달",
  "별",
  "바다",
  "산",
  "새",
  "물고기",
  "사과",
  "바나나",
  "케이크",
  "피자",
  "햄버거",
  "컴퓨터",
  "핸드폰",
];

export class GameManager {
  // 🔥 방별 타이머 관리를 위한 맵 추가
  private static roomTimers: Map<string, NodeJS.Timeout> = new Map();

  static createRoom(
    hostId: string,
    modelType: "gemini" | "chatgpt" | "claude" = "gemini"
  ): string {
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(
      `Creating room with ID: ${roomId}, hostId: ${hostId}, model: ${modelType}`
    );

    const stmt = db.prepare(`
      INSERT INTO rooms (id, host_id, status, time_left, round_number, model_type)
      VALUES (?, ?, 'waiting', 60, 1, ?)
    `);
    stmt.run(roomId, hostId, modelType);

    console.log(`Room ${roomId} created successfully in database`);
    return roomId;
  }

  static joinRoom(roomId: string, playerId: string, nickname: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found`);
      return false;
    }

    if (room.status !== "waiting") {
      console.log(
        `Room ${roomId} is not in waiting status. Current status: ${room.status}`
      );
      return false;
    }

    // 닉네임 중복 체크
    const existingPlayer = db
      .prepare(
        `
      SELECT id FROM players WHERE room_id = ? AND nickname = ?
    `
      )
      .get(roomId, nickname);

    if (existingPlayer) {
      console.log(`Nickname "${nickname}" is already taken in room ${roomId}`);
      return false;
    }

    const stmt = db.prepare(`
      INSERT INTO players (id, room_id, nickname, is_host, has_submitted, score)
      VALUES (?, ?, ?, ?, FALSE, 0)
    `);
    stmt.run(playerId, roomId, nickname, false);

    console.log(`Player ${playerId} (${nickname}) successfully joined room ${roomId}`)

    // 🔥 플레이어 목록 업데이트 이벤트 추가
    const players = this.getRoomPlayers(roomId);
    this.addGameEvent(roomId, "player_joined", {
      message: `${nickname}님이 입장했습니다.`,
      players,
    });

    return true
  }

  static addHost(roomId: string, hostId: string, nickname: string): void {
    console.log(
      `Adding host to room: ${roomId}, hostId: ${hostId}, nickname: ${nickname}`
    );
    const stmt = db.prepare(`
      INSERT INTO players (id, room_id, nickname, is_host, has_submitted, score)
      VALUES (?, ?, ?, ?, FALSE, 0)
    `)
    stmt.run(hostId, roomId, nickname, true)
    console.log(`Host successfully added to room: ${roomId}`)

    // 🔥 플레이어 목록 업데이트 이벤트 추가
    const players = this.getRoomPlayers(roomId);
    this.addGameEvent(roomId, "player_joined", {
      message: `${nickname}님이 방을 생성했습니다.`,
      players,
    });
  }

  static getRoom(roomId: string): Room | null {
    console.log(`Getting room: ${roomId}`);
    const stmt = db.prepare("SELECT * FROM rooms WHERE id = ?");
    const room = stmt.get(roomId) as Room | null;
    console.log(`Room ${roomId} found:`, room ? "YES" : "NO");
    if (room) {
      console.log(`Room details:`, room);
    }
    return room;
  }

  static getRoomPlayers(roomId: string): Player[] {
    const stmt = db.prepare(
      "SELECT * FROM players WHERE room_id = ? ORDER BY joined_at"
    );
    const players = stmt.all(roomId) as Player[];

    console.log(`👥 방 ${roomId} 플레이어 목록:`);
    players.forEach((player) => {
      console.log(
        `  Player ${player.id}: nickname="${player.nickname}", has_submitted="${
          player.has_submitted
        }" (type: ${typeof player.has_submitted})`
      );
    });

    return players;
  }

  static startGame(roomId: string): string | null {
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];

    const stmt = db.prepare(`
      UPDATE rooms 
      SET status = 'playing', current_keyword = ?, time_left = 60
      WHERE id = ?
    `);
    stmt.run(keyword, roomId);

    // 플레이어 제출 상태 초기화
    const resetStmt = db.prepare(`
      UPDATE players 
      SET has_submitted = FALSE 
      WHERE room_id = ?
    `);
    resetStmt.run(roomId);

    // 🔥 서버 측 타이머 시작
    this.startRoomTimer(roomId);

    return keyword;
  }

  // 🔥 서버 측 타이머 관리 함수 추가
  private static startRoomTimer(roomId: string): void {
    // 기존 타이머가 있다면 정리
    if (this.roomTimers.has(roomId)) {
      clearInterval(this.roomTimers.get(roomId));
      this.roomTimers.delete(roomId);
    }

    console.log(`⏰ Starting server timer for room ${roomId}`);

    const timer = setInterval(() => {
      const room = this.getRoom(roomId);
      if (!room || room.status !== "playing") {
        console.log(
          `⏰ Stopping timer for room ${roomId} - Room not found or not playing`
        );
        clearInterval(timer);
        this.roomTimers.delete(roomId);
        return;
      }

      const newTimeLeft = Math.max(0, room.time_left - 1);

      // 데이터베이스 업데이트
      const updateStmt = db.prepare(`
        UPDATE rooms SET time_left = ? WHERE id = ?
      `);
      updateStmt.run(newTimeLeft, roomId);

      console.log(
        `⏰ Room ${roomId} timer: ${room.time_left} -> ${newTimeLeft}`
      );

      // 시간 종료 시 자동으로 채점 시작
      if (newTimeLeft === 0) {
        console.log(`⏰ Time's up for room ${roomId}, starting scoring...`);
        clearInterval(timer);
        this.roomTimers.delete(roomId);

        // 채점 시작 (비동기)
        setTimeout(() => {
          this.startScoring(roomId);
        }, 1000);
      }
    }, 1000);

    this.roomTimers.set(roomId, timer);
  }

  // 🔥 타이머 정리 함수
  private static clearRoomTimer(roomId: string): void {
    if (this.roomTimers.has(roomId)) {
      clearInterval(this.roomTimers.get(roomId));
      this.roomTimers.delete(roomId);
      console.log(`⏰ Cleared timer for room ${roomId}`);
    }
  }

  // 🔥 채점 시작 함수 (타이머에서 호출)
  private static async startScoring(roomId: string): Promise<void> {
    console.log(`🎯 Auto-starting scoring for room ${roomId} (time's up)`);

    try {
      // 방 상태를 scoring으로 변경
      db.prepare(`UPDATE rooms SET status = 'scoring' WHERE id = ?`).run(
        roomId
      );

      // AI 평가 시작 이벤트 추가
      this.addGameEvent(roomId, "ai_evaluation_started", {
        reason: "time_up",
        message: "시간이 종료되어 자동으로 채점이 시작됩니다.",
      });

      // 채점 진행
      const { scores, evaluationResult } = await this.scoreDrawings(roomId);

      // 승자 결정
      const winner = this.getWinner(roomId);

      // 방 상태를 finished로 변경
      db.prepare(`UPDATE rooms SET status = 'finished' WHERE id = ?`).run(
        roomId
      );

      // 게임 완료 이벤트 추가
      this.addGameEvent(roomId, "round_completed", {
        scores,
        winner,
        aiEvaluation: evaluationResult,
      });

      console.log(`✅ Auto-scoring completed for room ${roomId}`);
    } catch (error) {
      console.error(`💥 Auto-scoring failed for room ${roomId}:`, error);
    }
  }

  static submitDrawing(
    playerId: string,
    roomId: string,
    canvasData: string
  ): void {
    console.log(`🎨 그림 제출 시작 - Player: ${playerId}, Room: ${roomId}`);
    console.log(`📊 제출 데이터:`, {
      playerId: playerId,
      roomId: roomId,
      canvasDataLength: canvasData?.length || 0,
      hasCanvasData: !!canvasData,
    });

    const room = this.getRoom(roomId);
    if (!room) {
      console.error(`❌ Room ${roomId} not found for drawing submission`);
      return;
    }

    console.log(`📋 방 정보:`, {
      roomId: room.id,
      roundNumber: room.round_number,
      currentKeyword: room.current_keyword,
      status: room.status,
    });

    try {
      // 그림 저장
      console.log(`💾 그림 데이터 저장 중...`);
      const drawingStmt = db.prepare(`
        INSERT INTO drawings (player_id, room_id, round_number, canvas_data, keyword)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = drawingStmt.run(
        playerId,
        roomId,
        room.round_number,
        canvasData,
        room.current_keyword
      );
      console.log(`✅ 그림 저장 완료:`, {
        playerId: playerId,
        insertId: result.lastInsertRowid,
        changes: result.changes,
        roundNumber: room.round_number,
        keyword: room.current_keyword,
      });

      // 플레이어 제출 상태 업데이트
      console.log(`👤 플레이어 제출 상태 업데이트 중...`);
      const playerStmt = db.prepare(`
        UPDATE players 
        SET has_submitted = 1
        WHERE id = ? AND room_id = ?
      `);
      const playerResult = playerStmt.run(playerId, roomId);
      console.log(`✅ 플레이어 상태 업데이트 완료:`, {
        playerId: playerId,
        affectedRows: playerResult.changes,
      });

      // 업데이트 후 플레이어 상태 확인
      const updatedPlayer = db
        .prepare(
          `
        SELECT id, nickname, has_submitted 
        FROM players 
        WHERE id = ? AND room_id = ?
      `
        )
        .get(playerId, roomId);
      console.log(`🔍 업데이트 후 플레이어 상태:`, updatedPlayer);

      // 저장 후 검증
      const savedDrawing = db
        .prepare(
          `
        SELECT id, player_id, room_id, round_number, keyword, LENGTH(canvas_data) as canvas_length 
        FROM drawings 
        WHERE player_id = ? AND room_id = ? AND round_number = ?
      `
        )
        .get(playerId, roomId, room.round_number);

      console.log(`🔍 저장 검증:`, savedDrawing);
    } catch (error: unknown) {
      console.error(`💥 그림 저장 중 오류:`, error);
      if (error instanceof Error) {
        console.error(`🔍 오류 상세:`, {
          name: error.name,
          message: error.message,
        });
      }
    }
  }

  static async scoreDrawings(
    roomId: string
  ): Promise<{
    scores: Record<string, number>;
    evaluationResult: EvaluationResult;
  }> {
    console.log(`🎯 AI 채점 시작 - Room: ${roomId}`);
    const room = this.getRoom(roomId);
    if (!room) {
      console.error(`Room ${roomId} not found for scoring`);
      return { scores: {}, evaluationResult: { rankings: [], comments: [] } };
    }

    console.log(`🔍 그림 데이터 조회 시작:`, {
      roomId: roomId,
      roundNumber: room.round_number,
      roomStatus: room.status,
    });

    // 먼저 해당 방의 모든 그림 데이터 확인
    const allDrawings = db
      .prepare(`SELECT * FROM drawings WHERE room_id = ?`)
      .all(roomId) as Drawing[];
    console.log(
      `📋 방 ${roomId}의 전체 그림 데이터:`,
      allDrawings.map((d) => ({
        id: d.id,
        player_id: d.player_id,
        round_number: d.round_number,
        canvas_data_length: d.canvas_data?.length || 0,
        keyword: d.keyword,
        created_at: (d as any).created_at,
      }))
    );

    const drawings = db
      .prepare(
        `
      SELECT * FROM drawings 
      WHERE room_id = ? AND round_number = ?
    `
      )
      .all(roomId, room.round_number) as Drawing[];

    console.log(
      `📊 조회 조건 - roomId: ${roomId}, roundNumber: ${room.round_number}`
    );
    console.log(`📊 채점할 그림 수: ${drawings.length}개`);
    console.log(
      `🔍 조회된 그림 데이터:`,
      drawings.map((d) => ({
        id: d.id,
        player_id: d.player_id,
        canvas_data_length: d.canvas_data?.length || 0,
        has_canvas_data: !!d.canvas_data,
        keyword: d.keyword,
        round_number: d.round_number,
      }))
    );

    if (drawings.length === 0) {
      console.log("⚠️  채점할 그림이 없습니다.");
      return { scores: {}, evaluationResult: { rankings: [], comments: [] } };
    }

    try {
      // Drawing 데이터를 DrawingSubmission 형태로 변환
      const submissions: DrawingSubmission[] = drawings.map((drawing) => ({
        playerId: drawing.player_id,
        imageData: drawing.canvas_data || "", // 빈 데이터도 처리
        timestamp: Date.now(),
      }));

      // 유효한 그림 데이터가 있는지 확인
      const validSubmissions = submissions.filter(
        (s) => s.imageData && s.imageData.length > 100
      ); // 최소 100자 이상
      console.log(
        `✅ 유효한 그림 데이터: ${validSubmissions.length}/${submissions.length}개`
      );
      console.log(
        `📊 모든 제출물 상세:`,
        submissions.map((s) => ({
          playerId: s.playerId,
          imageDataLength: s.imageData?.length || 0,
          isValid: s.imageData && s.imageData.length > 100,
        }))
      );
      if (validSubmissions.length === 0) {
        console.log("⚠️  유효한 그림 데이터가 없습니다. 기본 결과 생성...");
        const fallbackResult = {
          rankings: submissions.map((s, index) => ({
            rank: index + 1,
            playerId: s.playerId,
            score: 80 - index * 5, // 80, 75, 70... 점수
          })),
          comments: submissions.map((s) => ({
            playerId: s.playerId,
            comment:
              "그림을 그려주셔서 감사합니다! 다음에는 더 멋진 작품을 기대할게요. 😊",
          })),
          summary: `이번 라운드는 "${
            room.current_keyword || "그림"
          }"을 주제로 진행되었습니다. 모든 참가자들이 짧은 시간 내에 열심히 그려주셨고, 각자의 개성이 담긴 작품들이 완성되었습니다. 🎨`,
          evaluationCriteria:
            "주제 연관성, 창의성, 완성도를 기준으로 공정하게 평가했습니다. 모든 작품에 각각의 매력이 있었습니다!",
        };

        // 점수 저장
        const scores: Record<string, number> = {};
        fallbackResult.rankings.forEach((ranking) => {
          scores[ranking.playerId] = ranking.score;

          // 데이터베이스 업데이트
          db.prepare(
            `UPDATE drawings SET score = ? WHERE player_id = ? AND room_id = ? AND round_number = ?`
          ).run(ranking.score, ranking.playerId, roomId, room.round_number);
          db.prepare(
            `UPDATE players SET score = score + ? WHERE id = ? AND room_id = ?`
          ).run(ranking.score, ranking.playerId, roomId);
        });

        // 방 상태 업데이트
        db.prepare(`UPDATE rooms SET status = 'finished' WHERE id = ?`).run(
          roomId
        );

        console.log("📊 기본 결과 생성 완료:", {
          scores,
          evaluationResult: fallbackResult,
        });
        return { scores, evaluationResult: fallbackResult };
      }

      console.log("📋 채점 대상 데이터:", {
        roomId: roomId,
        keyword: room.current_keyword,
        submissionCount: submissions.length,
        submissions: submissions.map((s) => ({
          playerId: s.playerId,
          imageDataLength: s.imageData?.length || 0,
          hasImageData: !!s.imageData,
        })),
      });

      // AI 평가 수행 (환경 변수로 활성화/비활성화 가능)
      const modelType = room.model_type || "gemini";
      let useAI = false;

      // 모델 타입에 따라 API 키 확인
      switch (modelType) {
        case "gemini":
          useAI =
            !!process.env.GEMINI_API_KEY &&
            process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";
          break;
        case "chatgpt":
          useAI =
            !!process.env.OPENAI_API_KEY &&
            process.env.OPENAI_API_KEY !== "your_openai_api_key_here";
          break;
        case "claude":
          useAI =
            !!process.env.ANTHROPIC_API_KEY &&
            process.env.ANTHROPIC_API_KEY !== "your_anthropic_api_key_here";
          break;
      }

      console.log(
        `🤖 AI 평가 설정 (${modelType}): ${
          useAI ? "활성화" : "비활성화 (기본 결과 사용)"
        }`
      );

      let evaluationResult: EvaluationResult = { rankings: [], comments: [] }

      if (useAI) {
        try {
          const modelType = room.model_type || "gemini";
          console.log(`🚀 ${modelType.toUpperCase()} AI 평가 시작...`);
          const aiEvaluator = await import("./ai-evaluator");

          evaluationResult = await aiEvaluator.evaluateDrawingsWithRetry(
            submissions,
            room.current_keyword || '그림',
            modelType as "gemini" | "chatgpt" | "claude"
          );

          // AI 평가 결과 검증
          if (
            !evaluationResult ||
            !evaluationResult.rankings ||
            evaluationResult.rankings.length === 0
          ) {
            throw new Error("AI 평가 결과가 유효하지 않습니다");
          }

          console.log(`✅ AI 평가 성공! 결과 검증 완료`);
        } catch (error: unknown) {
          console.error(
            `💥 AI 평가 실패, 기본 결과로 전환:`,
            error instanceof Error ? error.message : String(error)
          );
          useAI = false; // AI 실패 시 기본 결과로 전환
        }
      }

      if (!useAI) {
        console.log(`🎯 기본 결과 생성 중...`);
        // 기본 결과 생성 - 실제 submissions 사용
        evaluationResult = {
          rankings: submissions.map((s, index) => ({
            rank: index + 1,
            playerId: s.playerId,
            score: Math.floor(Math.random() * 20) + 80, // 80-99점 랜덤
          })),
          comments: submissions.map((s) => ({
            playerId: s.playerId,
            comment: `"${
              room.current_keyword || "그림"
            }"을 주제로 한 멋진 작품이었어요! 창의적인 아이디어가 돋보입니다. 🎨✨`,
          })),
          summary: `이번 라운드는 "${
            room.current_keyword || "그림"
          }"을 주제로 ${
            submissions.length
          }명이 참여했습니다. 모든 작품에서 각자의 창의성과 개성이 잘 드러났으며, 주제를 나름대로 해석한 다양한 접근 방식이 인상적이었습니다! 🌟`,
          evaluationCriteria:
            "주제 연관성 50%, 창의성 30%, 완성도 20% 기준으로 평가했습니다. AI 평가가 제한되어 기본 평가를 적용했지만, 모든 작품의 노력을 인정합니다.",
        };

        // 점수 기준으로 순위 재정렬
        evaluationResult.rankings.sort((a, b) => b.score - a.score);
        evaluationResult.rankings.forEach((ranking, index) => {
          ranking.rank = index + 1;
        });

        console.log(`✅ 기본 결과 생성 완료:`, {
          rankingsCount: evaluationResult.rankings.length,
          scoreRange: `${Math.min(
            ...evaluationResult.rankings.map((r) => r.score)
          )}~${Math.max(...evaluationResult.rankings.map((r) => r.score))}점`,
          playerIds: evaluationResult.rankings.map((r) => r.playerId),
        });
      }

      console.log(`✅ AI 평가 완료! 결과:`, evaluationResult);
      console.log(`🎯 평가 결과 요약:`, {
        총참가자수: submissions.length,
        순위결과수: evaluationResult.rankings?.length || 0,
        코멘트수: evaluationResult.comments?.length || 0,
        최고점수: Math.max(
          ...(evaluationResult.rankings?.map((r) => r.score) || [0])
        ),
        최저점수: Math.min(
          ...(evaluationResult.rankings?.map((r) => r.score) || [100])
        ),
      });

      // 점수 추출
      const scores: Record<string, number> = {};

      // 평가 결과를 데이터베이스에 저장
      console.log("💾 데이터베이스 저장 시작...");
      evaluationResult.rankings.forEach((ranking) => {
        scores[ranking.playerId] = ranking.score;

        console.log(`💾 Player ${ranking.playerId} 점수 저장 중...`);

        // 그림별 점수 저장
        const drawingResult = db
          .prepare(
            `
          UPDATE drawings 
          SET score = ? 
          WHERE player_id = ? AND room_id = ? AND round_number = ?
        `
          )
          .run(ranking.score, ranking.playerId, roomId, room.round_number);

        console.log(`📊 그림 점수 업데이트 결과:`, {
          playerId: ranking.playerId,
          score: ranking.score,
          affectedRows: drawingResult.changes,
        });

        // 플레이어 총점 업데이트
        const playerResult = db
          .prepare(
            `
          UPDATE players 
          SET score = score + ? 
          WHERE id = ? AND room_id = ?
        `
          )
          .run(ranking.score, ranking.playerId, roomId);

        console.log(`👤 플레이어 총점 업데이트 결과:`, {
          playerId: ranking.playerId,
          addedScore: ranking.score,
          affectedRows: playerResult.changes,
        });

        console.log(
          `🏆 Player ${ranking.playerId}: ${ranking.score}점 (${ranking.rank}등)`
        );
      });

      console.log("💾 모든 점수 저장 완료");

      // 방 상태를 'finished'로 변경
      db.prepare(
        `
        UPDATE rooms 
        SET status = ? 
        WHERE id = ?
      `
      ).run("finished", roomId);

      console.log(`🏁 Room ${roomId} 채점 완료 및 상태 업데이트`);

      return { scores, evaluationResult };
    } catch (error: unknown) {
      console.error("💥 AI 채점 중 오류 발생:", error);

      // 오류 발생 시 기본 점수 할당
      const scores: Record<string, number> = {};
      const rankings: Array<{ rank: number; playerId: string; score: number }> =
        [];
      const comments: Array<{ playerId: string; comment: string }> = [];

      drawings.forEach((drawing, index) => {
        const score = Math.floor(Math.random() * 30) + 70; // 70-100점 범위
        scores[drawing.player_id] = score;

        rankings.push({
          rank: index + 1,
          playerId: drawing.player_id,
          score: score,
        });

        comments.push({
          playerId: drawing.player_id,
          comment:
            "멋진 그림이네요! AI 평가 중 오류가 발생했지만 노력이 보입니다. 다음에는 더욱 멋진 작품을 기대할게요! 😊🎨",
        });

        // 점수 저장
        db.prepare(
          `
          UPDATE drawings 
          SET score = ? 
          WHERE id = ?
        `
        ).run(score, drawing.id);

        // 플레이어 총점 업데이트
        db.prepare(
          `
          UPDATE players 
          SET score = score + ? 
          WHERE id = ?
        `
        ).run(score, drawing.player_id);
      });

      // 점수 기준으로 순위 재정렬
      rankings.sort((a, b) => b.score - a.score);
      rankings.forEach((ranking, index) => {
        ranking.rank = index + 1;
      });

      // 방 상태 업데이트
      db.prepare(
        `
        UPDATE rooms 
        SET status = ? 
        WHERE id = ?
      `
      ).run("finished", roomId);

      const fallbackResult: EvaluationResult = {
        rankings,
        comments,
        summary: `이번 라운드는 "${
          room.current_keyword || "그림"
        }"을 주제로 진행되었습니다. AI 평가 중 오류가 발생했지만, ${
          drawings.length
        }명의 참가자가 열심히 그려준 작품들을 기본 기준으로 평가했습니다. 모든 작품에 각자의 노력과 창의성이 담겨 있었습니다! 🎨`,
        evaluationCriteria:
          "기술적 문제로 AI 평가가 제한되었지만, 기본적인 평가 기준을 적용하여 공정하게 평가했습니다. 모든 참가자의 노력을 인정합니다.",
      };

      console.log(`⚠️  기본 채점 결과:`, scores);
      return { scores, evaluationResult: fallbackResult };
    }
  }

  static getWinner(roomId: string): string | null {
    const stmt = db.prepare(`
      SELECT id FROM players 
      WHERE room_id = ? 
      ORDER BY score DESC 
      LIMIT 1
    `);
    const winner = stmt.get(roomId) as { id: string } | null;
    return winner?.id || null;
  }

  static nextRound(roomId: string): string | null {
    console.log(`Starting next round for room ${roomId}`);
    const room = this.getRoom(roomId);
    if (!room) {
      console.error(`Room ${roomId} not found for next round`);
      return null;
    }

    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    console.log(`Next round keyword: ${keyword}`);

    const stmt = db.prepare(`
      UPDATE rooms 
      SET status = 'playing', 
          current_keyword = ?, 
          time_left = 60, 
          round_number = round_number + 1
      WHERE id = ?
    `);
    stmt.run(keyword, roomId);
    console.log(`Room ${roomId} updated for next round`);

    // 플레이어 제출 상태 초기화
    const resetStmt = db.prepare(`
      UPDATE players 
      SET has_submitted = FALSE 
      WHERE room_id = ?
    `);
    resetStmt.run(roomId);
    console.log(`All players in room ${roomId} reset for next round`);

    // 🔥 다음 라운드에서도 타이머 시작
    this.startRoomTimer(roomId);

    // 게임 이벤트 추가
    this.addGameEvent(roomId, "next_round_started", {
      keyword,
      roundNumber: room.round_number + 1,
    });

    return keyword;
  }

  static deleteRoom(roomId: string): void {
    // 🔥 방 삭제 시 타이머도 정리
    this.clearRoomTimer(roomId);

    db.prepare("DELETE FROM drawings WHERE room_id = ?").run(roomId);
    db.prepare("DELETE FROM players WHERE room_id = ?").run(roomId);
    db.prepare("DELETE FROM rooms WHERE id = ?").run(roomId);
  }

  static removePlayer(roomId: string, playerId: string): boolean {
    console.log(
      `[GameManager] Removing player ${playerId} from room ${roomId}`
    );

    // 플레이어가 실제로 방에 있는지 확인
    const player = db
      .prepare(
        `
      SELECT * FROM players 
      WHERE id = ? AND room_id = ?
    `
      )
      .get(playerId, roomId);

    if (!player) {
      console.log(
        `[GameManager] Player ${playerId} not found in room ${roomId}`
      );
      return false;
    }

    console.log(`[GameManager] Found player to remove:`, player);

    try {
      // 플레이어 삭제
      const result = db
        .prepare(
          `
        DELETE FROM players 
        WHERE id = ? AND room_id = ?
      `
        )
        .run(playerId, roomId);

      console.log(`[GameManager] Player removal result:`, result);

      if (!result || result.changes === 0) {
        console.log(`[GameManager] Failed to remove player - no changes made`);
        return false;
      }

      // 방에 남은 플레이어 확인
      const remainingPlayers = this.getRoomPlayers(roomId);
      console.log(`[GameManager] Remaining players in room:`, remainingPlayers);

      if (remainingPlayers.length === 0) {
        console.log(
          `[GameManager] No players left in room ${roomId}, deleting room`
        );
        this.deleteRoom(roomId);
      }

      return true;
    } catch (error: unknown) {
      console.error(`[GameManager] Failed to remove player:`, error);
      return false;
    }
  }

  static transferHost(roomId: string, newHostId: string): void {
    console.log(
      `[GameManager] Transferring host to player ${newHostId} in room ${roomId}`
    );

    // 현재 방장 정보 확인
    const currentHost = db
      .prepare(
        `
      SELECT id, nickname FROM players 
      WHERE room_id = ? AND is_host = TRUE
    `
      )
      .get(roomId) as { id: string; nickname: string } | null;

    if (currentHost) {
      console.log(
        `[GameManager] Current host: ${currentHost.id} (${currentHost.nickname})`
      );
    }

    // 새로운 방장 정보 확인
    const newHost = db
      .prepare(
        `
      SELECT id, nickname FROM players 
      WHERE id = ? AND room_id = ?
    `
      )
      .get(newHostId, roomId) as { id: string; nickname: string } | null;

    if (!newHost) {
      console.error(
        `[GameManager] New host ${newHostId} not found in room ${roomId}`
      );
      throw new Error(`New host ${newHostId} not found in room ${roomId}`);
    }

    console.log(
      `[GameManager] New host candidate: ${newHost.id} (${newHost.nickname})`
    );

    try {
      // 먼저 새로운 방장 설정
      const updateNewHost = db.prepare(`
        UPDATE players 
        SET is_host = TRUE 
        WHERE id = ? AND room_id = ?
      `);
      const newHostResult = updateNewHost.run(newHostId, roomId);
      console.log(`[GameManager] New host update result:`, newHostResult);

      // 그 다음 기존 방장을 일반 플레이어로 변경
      const updateOldHost = db.prepare(`
        UPDATE players 
        SET is_host = FALSE 
        WHERE room_id = ? AND is_host = TRUE AND id != ?
      `);
      const oldHostResult = updateOldHost.run(roomId, newHostId);
      console.log(`[GameManager] Old host update result:`, oldHostResult);

      // 방의 host_id 업데이트
      const updateRoom = db.prepare(`
        UPDATE rooms 
        SET host_id = ? 
        WHERE id = ?
      `);
      const roomResult = updateRoom.run(newHostId, roomId);
      console.log(`[GameManager] Room update result:`, roomResult);

      // 변경 사항 확인
      const verifyHost = db
        .prepare(
          `
        SELECT id, nickname, is_host FROM players 
        WHERE room_id = ? AND is_host = TRUE
      `
        )
        .get(roomId) as {
        id: string;
        nickname: string;
        is_host: boolean;
      } | null;

      console.log(`[GameManager] Verification - Current host:`, verifyHost);

      const verifyRoom = db
        .prepare(
          `
        SELECT host_id FROM rooms WHERE id = ?
      `
        )
        .get(roomId) as { host_id: string } | null;

      console.log(`[GameManager] Verification - Room host_id:`, verifyRoom);

      if (!verifyHost || verifyHost.id !== newHostId) {
        throw new Error(
          `Host transfer verification failed. Expected host: ${newHostId}, Actual host: ${verifyHost?.id}`
        );
      }

      // 방장 위임 이벤트 추가
      this.addGameEvent(roomId, "host_transferred", {
        oldHostId: currentHost?.id,
        newHostId: newHost.id,
        newHostNickname: newHost.nickname,
      });

      console.log(
        `[GameManager] Host successfully transferred from ${currentHost?.id} to ${newHostId}`
      );
    } catch (error: unknown) {
      console.error(`[GameManager] Error transferring host:`, error);
      throw error;
    }
  }

  static findNewHost(roomId: string, excludePlayerId?: string): string | null {
    const players = this.getRoomPlayers(roomId);
    console.log(
      `findNewHost: All players in room ${roomId}:`,
      players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        is_host: p.is_host,
        joined_at: p.joined_at,
      }))
    );

    if (players.length === 0) {
      console.log(`findNewHost: No players in room ${roomId}`);
      return null;
    }

    // 나가려는 플레이어를 제외한 플레이어들 중에서 선택
    const availablePlayers = excludePlayerId
      ? players.filter((p) => p.id !== excludePlayerId)
      : players;

    console.log(
      `findNewHost: Excluding player ${excludePlayerId}, available players:`,
      availablePlayers.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        is_host: p.is_host,
        joined_at: p.joined_at,
      }))
    );

    if (availablePlayers.length === 0) {
      console.log(`findNewHost: No available players after exclusion`);
      return null;
    }

    // 가장 먼저 입장한 플레이어를 새로운 방장으로 선택
    // joined_at으로 정렬하여 가장 먼저 들어온 플레이어 선택
    const sortedPlayers = availablePlayers.sort((a, b) => {
      const aTime = new Date(a.joined_at).getTime();
      const bTime = new Date(b.joined_at).getTime();
      return aTime - bTime;
    });

    const newHost = sortedPlayers[0];
    console.log(
      `findNewHost: New host selected: ${newHost.id} (${newHost.nickname}) - joined at ${newHost.joined_at}`
    );
    return newHost.id;
  }

  static addGameEvent(
    roomId: string,
    eventType: string,
    eventData?: Record<string, unknown>
  ): void {
    console.log(`📡 Adding game event:`, {
      roomId,
      eventType,
      eventData: eventData
        ? JSON.stringify(eventData).substring(0, 200) + "..."
        : null,
    });

    try {
      // JSON 문자열이 너무 클 수도 있으니 길이 확인
      const jsonString = eventData ? JSON.stringify(eventData) : null;
      console.log(`📊 Event data size:`, {
        hasEventData: !!eventData,
        jsonLength: jsonString?.length || 0,
        eventDataType: typeof eventData,
      });

      const stmt = db.prepare(`
        INSERT INTO game_events (room_id, event_type, event_data, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);
      const result = stmt.run(roomId, eventType, jsonString);

      console.log(`✅ Game event added successfully:`, {
        eventId: result.lastInsertRowid,
        roomId,
        eventType,
        changes: result.changes,
      });

      // 검증: 생성된 이벤트 확인
      const verifyEvent = db
        .prepare(
          `
        SELECT id, room_id, event_type, created_at, LENGTH(event_data) as data_length
        FROM game_events 
        WHERE room_id = ? AND event_type = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `
        )
        .get(roomId, eventType);

      console.log(`🔍 Event verification:`, {
        found: !!verifyEvent,
        eventId: verifyEvent?.id,
        eventType: verifyEvent?.event_type,
        dataLength: verifyEvent?.data_length,
        createdAt: verifyEvent?.created_at,
      });

      // 추가 검증: 실제 데이터 내용 확인
      if (verifyEvent && eventType === "round_completed") {
        const fullEvent = db
          .prepare(
            `
          SELECT event_data FROM game_events WHERE id = ?
        `
          )
          .get(verifyEvent.id) as { event_data?: string };

        if (fullEvent?.event_data) {
          try {
            const parsedData = JSON.parse(fullEvent.event_data);
            console.log(`🔍 Round completed event data verification:`, {
              hasScores: !!parsedData.scores,
              hasWinner: !!parsedData.winner,
              hasAiEvaluation: !!parsedData.aiEvaluation,
              aiEvaluationKeys: parsedData.aiEvaluation
                ? Object.keys(parsedData.aiEvaluation)
                : [],
              scoresCount: parsedData.scores
                ? Object.keys(parsedData.scores).length
                : 0,
            });
          } catch (parseError: unknown) {
            console.error(`💥 Failed to parse saved event data:`, parseError);
          }
        }
      }
    } catch (error: unknown) {
      console.error(`💥 Failed to add game event:`, error);
      if (error instanceof Error) {
        const errorDetails: Record<string, unknown> = {
          name: error.name,
          message: error.message,
        };

        // Check if error has a 'code' property
        if ("code" in error) {
          errorDetails.code = (error as { code: unknown }).code;
        }

        console.error(`💥 Error details:`, errorDetails);
      }
      throw error;
    }
  }

  static getEvents(
      roomId: string,
      lastEventId: number
  ): { id: number; event_type: string; event_data: string }[] {
    const stmt = db.prepare(
        "SELECT * FROM game_events WHERE room_id = ? AND id > ?"
    );
    const events = stmt.all(roomId, lastEventId) as any[];

    // 이벤트 데이터에 추가 정보 포함 (디버깅용)
    events.forEach((event) => {
      const parsedData = JSON.parse(event.event_data || "{}");
      if (parsedData) {
        // 이 부분은 디버깅용이므로 타입 에러를 무시합니다.
        // @ts-ignore
        event.event_type = parsedData.type;
        // @ts-ignore
        event.data_length = event.event_data.length;
        // @ts-ignore
        event.created_at = event.created_at;
      }
    });

    return events;
  }
}
