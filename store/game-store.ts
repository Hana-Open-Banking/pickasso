import { create } from "zustand"

export interface Player {
  id: string
  nickname: string
  is_host: boolean
  has_submitted: boolean
  score: number
}

// AI 평가 결과 인터페이스
export interface AIEvaluation {
  rankings: Array<{
    rank: number
    playerId: string
    score: number
  }>
  comments: Array<{
    playerId: string
    comment: string
  }>
  summary?: string // 전체 평가 해설
  evaluationCriteria?: string // 평가 기준 설명
}

export interface GameState {
  // 기본 정보
  nickname: string
  roomId: string
  playerId: string
  isHost: boolean

  // 게임 상태
  currentPhase: "lobby" | "drawing" | "scoring" | "result"
  players: Player[]
  keyword: string
  timeLeft: number

  // 그림 및 점수
  canvasData: string
  scores: Record<string, number>
  winner: string
  aiEvaluation: AIEvaluation | null
  processingMessage: string

  // 액션들
  setNickname: (nickname: string) => void
  setRoomId: (roomId: string) => void
  setPlayerId: (playerId: string) => void
  setIsHost: (isHost: boolean) => void
  setPhase: (phase: GameState["currentPhase"]) => void
  setPlayers: (players: Player[]) => void
  setKeyword: (keyword: string) => void
  setTimeLeft: (time: number) => void
  setCanvasData: (data: string) => void
  setScores: (scores: Record<string, number>) => void
  setWinner: (winner: string) => void
  setAIEvaluation: (evaluation: AIEvaluation | null) => void

  // 서버 액션들
  createRoom: () => Promise<string | null>
  joinRoom: (roomId: string) => Promise<{ success: boolean; error?: string }>
  startGame: () => Promise<void>
  submitDrawing: (canvasData: string) => Promise<void>
  nextRound: () => Promise<void>
  resetGame: () => void
  leaveRoom: () => Promise<void>
}

export const useGameStore = create<GameState>((set, get) => {
  return {
    // 초기 상태
    nickname: "",
    roomId: "",
    playerId: "",
    isHost: false,
    currentPhase: "lobby",
    players: [],
    keyword: "",
    timeLeft: 60,
    canvasData: "",
    scores: {},
    winner: "",
    aiEvaluation: null,
    processingMessage: "",

    // 기본 setter들
    setNickname: (nickname) => set({ nickname }),
    setRoomId: (roomId) => set({ roomId }),
    setPlayerId: (playerId) => set({ playerId }),
    setIsHost: (isHost) => set({ isHost }),
    setPhase: (currentPhase) => {
    console.log("🔄 Phase change:", currentPhase)
    console.log("🔄 Current state before phase change:", get())
    set({ currentPhase })
    console.log("🔄 State after phase change:", get())
  },
    setPlayers: (players) => {
      const state = get()
      // 현재 플레이어의 방장 상태 업데이트
      const currentPlayer = players.find(p => p.id === state.playerId)
      if (currentPlayer) {
        const isHost = currentPlayer.is_host || false
        console.log("Setting players:", {
          total: players.length,
          currentPlayer: {
            id: currentPlayer.id,
            nickname: currentPlayer.nickname,
            is_host: currentPlayer.is_host
          },
          isHost
        })
        set({ players, isHost })
      } else {
        console.log("Current player not found in players list:", {
          playerId: state.playerId,
          players: players.map(p => ({ id: p.id, nickname: p.nickname, is_host: p.is_host }))
        })
        set({ players })
      }
    },
    setKeyword: (keyword) => set({ keyword }),
    setTimeLeft: (timeLeft) => set({ timeLeft }),
    setCanvasData: (canvasData) => set({ canvasData }),
      setScores: (scores) => {
    console.log("🎯 Setting scores:", scores)
    console.log("🎯 Previous state:", get().scores)
    set({ scores: { ...scores } })  // 불변성 보장
    console.log("🎯 New state:", get().scores)
  },
  setWinner: (winner) => {
    console.log("🏆 Setting winner:", winner)
    console.log("🏆 Previous state:", get().winner)
    set({ winner })
    console.log("🏆 New state:", get().winner)
  },
  setAIEvaluation: (aiEvaluation) => {
    console.log("🤖 Setting AI evaluation:", aiEvaluation)
    console.log("🤖 AI rankings:", aiEvaluation?.rankings)
    console.log("🤖 AI comments:", aiEvaluation?.comments)
    console.log("🤖 AI summary:", aiEvaluation?.summary)
    console.log("🤖 AI evaluation criteria:", aiEvaluation?.evaluationCriteria)
    console.log("🤖 Previous state:", get().aiEvaluation)
    
    if (aiEvaluation) {
      const newAiEvaluation = {
        rankings: aiEvaluation.rankings ? [...aiEvaluation.rankings.map(r => ({ ...r }))] : [],
        comments: aiEvaluation.comments ? [...aiEvaluation.comments.map(c => ({ ...c }))] : [],
        summary: aiEvaluation.summary || undefined,
        evaluationCriteria: aiEvaluation.evaluationCriteria || undefined
      }
      console.log("🤖 새로 설정될 AI 평가 객체:", newAiEvaluation)
      set({ aiEvaluation: newAiEvaluation })
    } else {
      console.log("🤖 AI 평가를 null로 설정")
      set({ aiEvaluation: null })
    }
    
    // 즉시 검증
    setTimeout(() => {
      const currentState = get().aiEvaluation
      console.log("🤖 설정 후 실제 상태:", currentState)
      console.log("🤖 설정 성공 여부:", {
        isSet: !!currentState,
        hasRankings: !!currentState?.rankings,
        hasComments: !!currentState?.comments,
        hasSummary: !!currentState?.summary,
        hasEvaluationCriteria: !!currentState?.evaluationCriteria
      })
    }, 50)
  },

    // 서버 액션들
    createRoom: async () => {
      const state = get()
      const playerId = Date.now().toString()

      try {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostId: playerId,
            nickname: state.nickname,
          }),
        })

        const data = await response.json()

        if (data.success) {
          set({
            roomId: data.roomId,
            playerId,
            isHost: true,
            players: data.players,
          })
          return data.roomId
        }
        return null
      } catch (error) {
        console.error("Error creating room:", error)
        return null
      }
    },

    joinRoom: async (roomId: string) => {
      const state = get()
      const playerId = Date.now().toString()

      try {
        const response = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            playerId,
            nickname: state.nickname,
          }),
        })

        const data = await response.json()

        if (data.success) {
          set({
            roomId,
            playerId,
            isHost: data.isHost,
            players: data.players,
          })
          return { success: true }
        } else {
          console.error("Failed to join room:", data.error)
          return { success: false, error: data.error }
        }
      } catch (error) {
        console.error("Error joining room:", error)
        return { success: false, error: "네트워크 오류가 발생했습니다. 다시 시도해주세요." }
      }
    },

    startGame: async () => {
      const state = get()

      try {
        const response = await fetch("/api/games/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: state.roomId,
            hostId: state.playerId,
          }),
        })

        const data = await response.json()

        if (data.success) {
          // 방장은 즉시 게임 화면으로 전환
          set({
            currentPhase: "drawing",
            keyword: data.keyword,
            timeLeft: 60,
          })
        }
      } catch (error) {
        console.error("Error starting game:", error)
      }
    },

    submitDrawing: async (canvasData: string) => {
      const state = get()
      
      console.log("Submitting drawing:", {
        playerId: state.playerId,
        roomId: state.roomId,
        canvasDataLength: canvasData?.length || 0,
        currentPhase: state.currentPhase
      })

      if (!state.playerId || !state.roomId) {
        console.error("Missing required data for submission:", {
          hasPlayerId: !!state.playerId,
          hasRoomId: !!state.roomId
        })
        return
      }

      try {
        // ✅ 개선: 제출 후 즉시 "처리 중" 상태로 변경
        set({ currentPhase: "scoring" })

        const response = await fetch("/api/drawings/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: state.playerId,
            roomId: state.roomId,
            canvasData: canvasData || "",
          }),
        })

        const data = await response.json()
        console.log("Submit response:", data)

        if (data.success && data.allSubmitted) {
          if (data.processing) {
            // ✅ 개선: 모든 사용자가 동일하게 처리 중 상태 표시
            console.log("🤖 AI 평가 중... SSE를 통해 결과를 기다립니다");
            console.log("💡 메시지:", data.message);
            
            // 처리 중 상태 유지 (SSE에서 결과를 받을 때까지)
            set({ 
              currentPhase: "scoring",
              processingMessage: data.message || "AI가 작품을 평가하고 있습니다..."
            })
          } else {
            // 레거시 코드 (혹시 모를 호환성을 위해 유지)
            console.log("⚠️ 레거시 응답 형식 감지");
            set({
              scores: data.scores || {},
              winner: data.winner || "",
              aiEvaluation: data.aiEvaluation || null,
              currentPhase: "result",
            })
          }
        } else if (data.success) {
          console.log("그림 제출 완료, 다른 플레이어 대기 중...")
          // 다른 플레이어들이 제출할 때까지 대기
        }
      } catch (error) {
        console.error("Error submitting drawing:", error)
        set({ currentPhase: "drawing" }) // 오류 시 다시 그리기 단계로
      }
    },

    nextRound: async () => {
      const state = get()

      try {
        const response = await fetch("/api/games/next-round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: state.roomId,
            hostId: state.playerId,
          }),
        })

        const data = await response.json()
        console.log("Next round response:", data)

        if (data.success) {
          set({
            currentPhase: "drawing",
            keyword: data.keyword,
            timeLeft: 60,
            canvasData: "",
            scores: {},
            winner: "",
            aiEvaluation: null,
            processingMessage: "",
          })
          console.log("Next round started successfully")
        }
      } catch (error) {
        console.error("Error starting next round:", error)
      }
    },

    resetGame: () => {
      set({
        nickname: "",
        roomId: "",
        playerId: "",
        isHost: false,
        currentPhase: "lobby",
        players: [],
        keyword: "",
        timeLeft: 60,
        canvasData: "",
        scores: {},
        winner: "",
        aiEvaluation: null,
        processingMessage: "",
      })
    },

    leaveRoom: async () => {
      const state = get()

      try {
        const response = await fetch("/api/rooms/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: state.roomId,
            playerId: state.playerId,
          }),
        })

        const data = await response.json()

        if (data.success) {
          set({
            nickname: "",
            roomId: "",
            playerId: "",
            isHost: false,
            currentPhase: "lobby",
            players: [],
            keyword: "",
            timeLeft: 60,
            canvasData: "",
            scores: {},
            winner: "",
            aiEvaluation: null,
          })
        } else {
          console.error("Failed to leave room:", data.error)
        }
      } catch (error) {
        console.error("Error leaving room:", error)
      }
    },
  }
})
