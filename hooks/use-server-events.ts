// useServerEvents.ts - 수정된 버전

"use client";

import { useEffect, useState, useRef } from "react";
import { useGameStore } from "@/store/game-store";

interface ServerEvent {
  type: string;
  room?: any;
  players?: any[];
  events?: any[];
}

export function useServerEvents(roomId: string) {
  const {
    setPlayers,
    setPhase,
    setKeyword,
    setScores,
    setWinner,
    setTimeLeft,
    currentPhase,
    setAIEvaluation,
  } = useGameStore();
  const [isConnected, setIsConnected] = useState(false);
  const lastPhaseRef = useRef(currentPhase);
  const isProcessingResultsRef = useRef(false);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [gameStartAlert, setGameStartAlert] = useState<{
    show: boolean;
    keyword: string;
    message: string;
  }>({ show: false, keyword: "", message: "" });
  const lastEventIdRef = useRef(0);
  const processedGameStartRef = useRef(false);
  const processedRoundCompletedRef = useRef(false);

  // localStorage에서 lastEventId 복원
  useEffect(() => {
    const savedLastEventId = localStorage.getItem(`lastEventId_${roomId}`);
    if (savedLastEventId) {
      lastEventIdRef.current = parseInt(savedLastEventId, 10);
      console.log(`Restored lastEventId from localStorage: ${lastEventIdRef.current}`);
    }
  }, [roomId]);

  // ✅ AI 평가 데이터 검증 및 정규화 함수 추가
  const normalizeAIEvaluation = (
    aiEvaluation: any,
    players: any[],
    scores: any
  ) => {
    if (
      !aiEvaluation ||
      !aiEvaluation.rankings ||
      !Array.isArray(aiEvaluation.rankings)
    ) {
      console.error("Invalid AI evaluation data:", aiEvaluation);
      return null;
    }

    // 플레이어 ID를 이름으로 매핑하는 맵 생성
    const playerMap = new Map()
    players.forEach(player => {
      playerMap.set(player.id, player.nickname || player.name)
    })


    console.log("🔍 Player mapping:", Array.from(playerMap.entries()));
    console.log("🔍 Original rankings:", aiEvaluation.rankings);
    console.log("🔍 Comments:", aiEvaluation.comments);

    // 코멘트를 플레이어 ID로 매핑
    const commentMap = new Map();
    if (aiEvaluation.comments && Array.isArray(aiEvaluation.comments)) {
      aiEvaluation.comments.forEach((comment: any) => {
        commentMap.set(comment.playerId, comment.comment);
      });
    }

    // AI 평가 데이터 정규화 - 서버의 rankings 순서를 신뢰
    const normalizedRankings = aiEvaluation.rankings.map((ranking: any) => {
      const playerId = ranking.playerId;
      const playerName = playerMap.get(playerId) || `Player ${playerId}`;
      // ranking.score를 우선 사용하고, 없으면 scores에서 가져오기
      const playerScore =
        ranking.score !== undefined ? ranking.score : scores[playerId] || 0;
      const playerComment = commentMap.get(playerId) || "";

      console.log(
        `Normalizing rank ${ranking.rank}: ${playerName} (${playerScore}점) - ID: ${playerId}`
      );
      console.log(
        `  Comment: ${
          playerComment ? playerComment.substring(0, 50) + "..." : "No comment"
        }`
      );

      return {
        rank: ranking.rank,
        playerId: playerId,
        player_name: playerName,
        score: playerScore,
        comment: playerComment,
      };
    });

    // 중복된 플레이어 체크
    const playerIdSet = new Set();
    const duplicates: string[] = [];

    normalizedRankings.forEach((ranking: any) => {
      if (playerIdSet.has(ranking.playerId)) {
        duplicates.push(ranking.player_name);
      }
      playerIdSet.add(ranking.playerId);
    });

    if (duplicates.length > 0) {
      console.warn(
        `⚠️ Duplicate players found in rankings: ${duplicates.join(", ")}`
      );
    }

    // 누락된 코멘트 체크
    const missingComments = normalizedRankings.filter((r: any) => !r.comment);
    if (missingComments.length > 0) {
      console.warn(
        `⚠️ Missing comments for players:`,
        missingComments.map((r: any) => r.player_name)
      );
    }

    console.log("✅ Normalized rankings:", normalizedRankings);

    return {
      ...aiEvaluation,
      rankings: normalizedRankings,
    };
  };

  // 게임 결과 직접 조회 함수 - 중복 호출 방지 개선
  const fetchGameResults = async (roomId: string, force: boolean = false) => {
    if (isProcessingResultsRef.current && !force) {
      console.log("🚫 Already processing results, skipping...");
      return;
    }

    isProcessingResultsRef.current = true;

    try {
      console.log("🔍 Fetching game results for room:", roomId);
      const response = await fetch(`/api/rooms/${roomId}/results`);
      if (response.ok) {
        const results = await response.json();
        console.log("🎊 Game results fetched:", results);

        // 현재 플레이어 정보 가져오기
        const currentState = useGameStore.getState();
        const players = currentState.players || [];

        // 모든 상태를 한 번에 업데이트하여 배치 처리 활용
        const updates: any = {};

        if (results.scores) {
          console.log("🏆 Scores from API:", results.scores);
          updates.scores = results.scores;
        }

        if (results.winner) {
          console.log("👑 Winner from API:", results.winner);
          updates.winner = results.winner;
        }

        if (results.aiEvaluation && results.scores) {
          console.log("🤖 AI evaluation from API:", results.aiEvaluation);
          // ✅ AI 평가 데이터 정규화
          const normalizedAI = normalizeAIEvaluation(
            results.aiEvaluation,
            players,
            results.scores
          );
          if (normalizedAI) {
            updates.aiEvaluation = normalizedAI;
          }
        }

        // 한번에 모든 상태 업데이트
        if (Object.keys(updates).length > 0) {
          console.log("🔄 Batch updating states:", updates);

          if (updates.scores) setScores(updates.scores);
          if (updates.winner) setWinner(updates.winner);
          if (updates.aiEvaluation) setAIEvaluation(updates.aiEvaluation);

          // 업데이트 완료 확인
          setTimeout(() => {
            const currentState = useGameStore.getState();
            console.log("✅ Final state after API update:", {
              scores: currentState.scores,
              winner: currentState.winner,
              aiEvaluation: currentState.aiEvaluation,
            });
          }, 200);
        }
      } else {
        console.error("Failed to fetch game results:", response.status);
      }
    } catch (error) {
      console.error("Error fetching game results:", error);
    } finally {
      // 3초 후에 다시 처리 가능하도록 설정
      setTimeout(() => {
        isProcessingResultsRef.current = false;
      }, 3000);
    }
  };

  // 결과 데이터 처리 함수 - 중복 로직 제거
  const processGameResults = (eventData: any, source: string) => {
    console.log(`🎊 Processing game results from ${source}:`, eventData);

    // 필수 데이터 검증
    if (!eventData.scores) {
      console.warn("⚠️ No scores data in event, fetching from API...");
      fetchGameResults(roomId, true);
      return;
    }

    // AI 평가 데이터 상세 검증
    if (
      !eventData.aiEvaluation ||
      !eventData.aiEvaluation.rankings ||
      !Array.isArray(eventData.aiEvaluation.rankings)
    ) {
      console.warn("⚠️ Invalid AI evaluation data, fetching from API...");
      console.log("⚠️ AI evaluation data:", eventData.aiEvaluation);
      fetchGameResults(roomId, true);
      return;
    }

    // ✅ 현재 플레이어 정보 가져오기
    const currentState = useGameStore.getState();
    const players = currentState.players || [];

    // ✅ AI 평가 데이터 정규화
    const normalizedAI = normalizeAIEvaluation(
      eventData.aiEvaluation,
      players,
      eventData.scores
    );
    if (!normalizedAI) {
      console.warn(
        "⚠️ Failed to normalize AI evaluation, fetching from API..."
      );
      fetchGameResults(roomId, true);
      return;
    }

    // 모든 데이터가 유효한 경우에만 상태 업데이트
    console.log("✅ All data valid, updating states...");
    console.log("✅ Scores:", eventData.scores);
    console.log("✅ Winner:", eventData.winner);
    console.log("✅ Normalized AI Evaluation:", normalizedAI);

    // React 배치 업데이트를 활용하여 한번에 상태 변경
    setScores(eventData.scores);
    setWinner(eventData.winner);
    setAIEvaluation(normalizedAI);
    setPhase("result");
    clearGameTimer();

    // 상태 업데이트 검증
    setTimeout(() => {
      const currentState = useGameStore.getState();
      console.log("🔍 State verification after update:", {
        scoresCount: Object.keys(currentState.scores || {}).length,
        hasWinner: !!currentState.winner,
        hasAIEvaluation: !!currentState.aiEvaluation,
        aiRankingsCount: currentState.aiEvaluation?.rankings?.length || 0,
        phase: currentState.currentPhase,
      });

      // 여전히 데이터가 부족하면 API에서 다시 가져오기
      const scoresCount = Object.keys(currentState.scores || {}).length;
      const expectedPlayerCount = players.length || 3; // players 배열이 비어있을 수 있음

      if (
        scoresCount < expectedPlayerCount ||
        !currentState.aiEvaluation ||
        currentState.aiEvaluation.rankings.length === 0
      ) {
        console.log("🔄 Data still incomplete, fetching from API as backup...");
        console.log(
          "🔄 Scores count:",
          scoresCount,
          "Expected:",
          expectedPlayerCount
        );
        console.log("🔄 AI Evaluation exists:", !!currentState.aiEvaluation);
        console.log(
          "🔄 Rankings count:",
          currentState.aiEvaluation?.rankings?.length || 0
        );
        fetchGameResults(roomId, true);
      }
    }, 500);
  };

  const startGameTimer = () => {
    // 기존 타이머가 있다면 정리
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }

    console.log("🔥 Starting SINGLE game timer...");
    const timer = setInterval(() => {
      const currentState = useGameStore.getState();
      const currentTime = currentState.timeLeft;
      console.log(`⏰ Client timer tick: ${currentTime} -> ${currentTime - 1}`);

      if (currentTime > 0) {
        setTimeLeft(currentTime - 1);
      } else {
        console.log("🔥 Client timer reached 0, clearing interval");
        clearInterval(timer);
        gameTimerRef.current = null;
        // 시간 종료 시 자동 제출 (서버에서도 처리하지만 클라이언트에서도 보장)
        if (
          currentState.canvasData &&
          currentState.currentPhase === "drawing"
        ) {
          console.log("Time's up! Auto-submitting drawing...");
          currentState.submitDrawing(currentState.canvasData);
        } else if (currentState.currentPhase === "drawing") {
          console.log("Time's up! No canvas data, but forcing submission...");
          currentState.submitDrawing("");
        }
      }
    }, 1000);

    gameTimerRef.current = timer;
  };

  const clearGameTimer = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
      console.log("Game timer cleared");
    }
  };

  const connectSSE = () => {
    if (!roomId) return null;

    const eventSource = new EventSource(
      `/api/events/${roomId}?lastEventId=${lastEventIdRef.current}`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("SSE Connected");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📡 SSE Event received:", data);

        if (data.type === "game_state") {
          // 플레이어 상태 업데이트
          if (data.players) {
            console.log("Updating players from game state:", data.players);
            setPlayers(data.players);
          }

          // 게임 상태 업데이트
          if (data.room) {
            console.log("Room status:", data.room.status);
            const currentPhase =
              data.room.status === "waiting"
                ? "lobby"
                : data.room.status === "playing"
                ? "drawing"
                : data.room.status === "scoring"
                ? "scoring"
                : data.room.status === "finished"
                ? "result"
                : "lobby";

            // 상태가 변경되었을 때만 처리
            if (lastPhaseRef.current !== currentPhase) {
              console.log(
                `Phase changed: ${lastPhaseRef.current} -> ${currentPhase}`
              );
              lastPhaseRef.current = currentPhase;
              setPhase(currentPhase);

              if (currentPhase === "drawing") {
                if (data.room.current_keyword) {
                  setKeyword(data.room.current_keyword);
                }
                // 🔥 서버에서 받은 time_left로 초기 동기화 (한 번만)
                if (data.room.time_left !== undefined) {
                  const currentTime = useGameStore.getState().timeLeft;
                  if (currentTime === 60 && data.room.time_left < 60) {
                    console.log(
                      `⏰ Initial sync: ${currentTime} -> ${data.room.time_left}`
                    );
                    setTimeLeft(data.room.time_left);
                  }
                }
                console.log(
                  "Drawing phase detected, waiting for game event to start timer"
                );
              } else if (currentPhase === "result") {
                console.log("🎯 Room finished, preparing for results...");
                clearGameTimer();
                isProcessingResultsRef.current = false;
              } else {
                clearGameTimer();
              }
            } else if (currentPhase === "drawing") {
              // 🔥 서버 시간 동기화 비활성화 (타이머 리셋 방지)
              console.log("Drawing phase continues, timer should be running");

              if (!gameTimerRef.current) {
                console.log(
                  "Timer not running during drawing phase, but NOT restarting automatically"
                );
              }
            }
          }

          // 최근 이벤트 처리 - 모든 이벤트를 순회하도록 변경
          if (data.events && data.events.length > 0) {
            // 이벤트 ID 업데이트: 받은 이벤트 중 가장 최신 ID로 업데이트
            lastEventIdRef.current = data.events[0].id;
            // localStorage에 저장
            localStorage.setItem(`lastEventId_${roomId}`, lastEventIdRef.current.toString());
            console.log(`Updated lastEventId to: ${lastEventIdRef.current}`);

            // 모든 이벤트를 시간 역순(과거->최신)으로 처리
            for (const latestEvent of [...data.events].reverse()) {
              console.log("📨 Processing event:", latestEvent);
              
              // round_completed 이벤트를 우선 처리
              if (latestEvent.event_type === "round_completed") {
                if (processedRoundCompletedRef.current) {
                  console.log("🚫 round_completed event already processed, skipping");
                  continue;
                }
                
                try {
                  const eventData = JSON.parse(latestEvent.event_data);
                  console.log("🎊 Processing round_completed event:", eventData);
                  
                  if (isProcessingResultsRef.current) {
                    console.log("🚫 Already processing results, skipping SSE event...");
                    continue;
                  }
                  
                  processedRoundCompletedRef.current = true;
                  isProcessingResultsRef.current = true;
                  processGameResults(eventData, "SSE");
                } catch (parseError) {
                  console.error("💥 round_completed 이벤트 파싱 오류:", parseError);
                  setPhase("result");
                  clearGameTimer();
                  fetchGameResults(roomId, true);
                }
                continue;
              }
              
              if (latestEvent.event_type === "game_start") {
                // 이미 처리한 game_start 이벤트인지 확인
                if (processedGameStartRef.current) {
                  console.log("🚫 game_start event already processed, skipping");
                  continue;
                }
                
                const eventData = JSON.parse(latestEvent.event_data || "{}");
                console.log("Processing game_start event:", eventData);
                
                // 처리 완료 플래그 설정
                processedGameStartRef.current = true;
                
                setGameStartAlert({
                  show: true,
                  keyword: eventData.keyword,
                  message:
                    eventData.message ||
                    `주제는 '${eventData.keyword}'입니다. 제한시간 60초 동안 마음껏 표현해주세요. 제출하지 않은 그림은 0점 처리됩니다.`,
                });
                setTimeout(() => {
                  setGameStartAlert({ show: false, keyword: "", message: "" });
                }, 2000);
                if (!gameTimerRef.current) {
                  setPhase("drawing");
                  setKeyword(eventData.keyword);
                  setTimeLeft(60);
                  startGameTimer();
                }
              } else if (latestEvent.event_type === "next_round_started") {
                const eventData = JSON.parse(latestEvent.event_data || "{}");
                console.log("Processing next_round_started event:", eventData);
                if (gameTimerRef.current) {
                  console.log(
                    "🚫 Timer already running, skipping next_round_started"
                  );
                  continue;
                }
                setPhase("drawing");
                setKeyword(eventData.keyword);
                setTimeLeft(60);
                console.log("⏰ Starting timer from next_round_started event");
                startGameTimer();
              } else if (latestEvent.event_type === "ai_evaluation_started") {
                // 이미 결과가 나온 경우 AI 평가 시작 이벤트 무시
                if (processedRoundCompletedRef.current) {
                  console.log("🚫 Results already processed, ignoring ai_evaluation_started");
                  continue;
                }
                
                const eventData = JSON.parse(latestEvent.event_data);
                console.log("🤖 AI 평가 시작 알림:", eventData);
                setPhase("scoring");
              } else if (latestEvent.event_type === "ai_evaluation_failed") {
                const eventData = JSON.parse(latestEvent.event_data);
                console.log("💥 AI 평가 실패 알림:", eventData);
                setPhase("result");
              }
            }
          }
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("💥 SSE Error:", error);
      setIsConnected(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Attempting to reconnect SSE...");
        connectSSE();
      }, 3000);
    };

    return eventSource;
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    // 중복 연결 방지를 위한 약간의 지연
    const timer = setTimeout(() => {
      if (!eventSource) {
        eventSource = connectSSE();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (eventSource) {
        eventSource.close();
      }
      setIsConnected(false);
      clearGameTimer();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // cleanup 시 플래그 초기화
      isProcessingResultsRef.current = false;
      processedGameStartRef.current = false;
      processedRoundCompletedRef.current = false;
      // localStorage 정리
      localStorage.removeItem(`lastEventId_${roomId}`);
    };
  }, [
    roomId,
    setPlayers,
    setPhase,
    setKeyword,
    setScores,
    setWinner,
    setTimeLeft,
  ]);

  return { 
    isConnected, 
    gameStartAlert, 
    setGameStartAlert 
  };
}
