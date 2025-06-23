"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, RotateCcw, Home, Crown, Sparkles, Bot } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ResultScreen() {
  // 🔥 개선: store 상태를 더 명시적으로 구독
  const players = useGameStore((state) => state.players)
  const scores = useGameStore((state) => state.scores)
  const winner = useGameStore((state) => state.winner)
  const isHost = useGameStore((state) => state.isHost)
  const playerId = useGameStore((state) => state.playerId)
  const nickname = useGameStore((state) => state.nickname)
  const aiEvaluation = useGameStore((state) => state.aiEvaluation)
  const nextRound = useGameStore((state) => state.nextRound)
  const resetGame = useGameStore((state) => state.resetGame)
  const leaveRoom = useGameStore((state) => state.leaveRoom)
  
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  const router = useRouter()

  // 🔥 디버깅용: 강제 리렌더링 함수
  const triggerForceUpdate = () => {
    setForceUpdate(prev => prev + 1)
    console.log("🔄 Force update triggered, checking store state...")
    const currentState = useGameStore.getState()
    console.log("🔄 Complete store state:", currentState)
  }

  // 🔍 디버깅: 컴포넌트 렌더링 시 상태 확인
  console.log("🎨 ResultScreen render:")
  console.log("🎨 Players:", players)
  console.log("🎨 Scores:", scores)
  console.log("🎨 Winner:", winner)
  console.log("🎨 AI Evaluation:", aiEvaluation)
  console.log("🎨 AI Rankings:", aiEvaluation?.rankings)
  console.log("🎨 AI Comments:", aiEvaluation?.comments)
  console.log("🎨 Current player ID:", playerId)

  // 🔍 디버깅: 결과 화면이 표시되지 않는 경우 체크
  useEffect(() => {
    console.log("🎨 ResultScreen mounted/updated")
    console.log("🎨 Players count:", players.length)
    console.log("🎨 Scores keys:", Object.keys(scores))
    console.log("🎨 Winner:", winner)
    console.log("🎨 AI Evaluation present:", !!aiEvaluation)
    
    // Store의 현재 상태를 직접 확인
    const currentState = useGameStore.getState()
    console.log("🔍 Direct store check - Scores:", currentState.scores)
    console.log("🔍 Direct store check - Winner:", currentState.winner)
    console.log("🔍 Direct store check - AI Evaluation:", currentState.aiEvaluation)
    console.log("🔍 Direct store check - Phase:", currentState.currentPhase)
  }, [players, scores, winner, aiEvaluation])

  // 실시간 store 상태 감시
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state) => {
      console.log("🎯 Store state changed:", {
        scores: state.scores,
        winner: state.winner,
        aiEvaluation: state.aiEvaluation,
        currentPhase: state.currentPhase
      })
    })

    return unsubscribe
  }, [])

  const getSortedPlayers = () => {
    console.log("🔍 getSortedPlayers called")
    console.log("🔍 AI Evaluation exists:", !!aiEvaluation)
    console.log("🔍 AI Rankings exists:", !!aiEvaluation?.rankings)
    console.log("🔍 AI Rankings length:", aiEvaluation?.rankings?.length || 0)
    
    if (aiEvaluation && aiEvaluation.rankings && aiEvaluation.rankings.length > 0) {
      console.log("🔍 Using AI rankings for sorting")
      const sortedRankings = aiEvaluation.rankings.sort((a, b) => a.rank - b.rank)
      console.log("🔍 Sorted AI rankings:", sortedRankings)
      
      const mappedPlayers = sortedRankings
        .map(ranking => {
          const player = players.find(p => p.id === ranking.playerId)
          console.log(`🔍 Mapping player ${ranking.playerId}:`, player)
          return player ? { ...player, aiRank: ranking.rank, aiScore: ranking.score } : null
        })
        .filter(Boolean)
      
      console.log("🔍 Final mapped players:", mappedPlayers)
      return mappedPlayers
    } else {
      console.log("🔍 Using default scores for sorting")
      const sortedByScore = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
      console.log("🔍 Sorted by scores:", sortedByScore)
      return sortedByScore
    }
  }

  const sortedPlayers = getSortedPlayers()

  // 🔍 디버깅: 데이터 상태 확인
  console.log("🎨 Sorted players:", sortedPlayers)
  console.log("🎨 Sorted players count:", sortedPlayers.length)

  // 안전장치: 플레이어 데이터가 없는 경우
  if (!players || players.length === 0) {
    console.log("⚠️  No players data, showing loading state")
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-white mb-2">결과 로딩 중...</h2>
            <p className="text-white/80">
              게임 결과를 불러오고 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 🔥 임시 디버깅: 점수가 비어있을 때 직접 zustand store에서 확인
  const currentStoreState = useGameStore.getState()
  console.log("🔥 Current store state inspection:", {
    scores: currentStoreState.scores,
    winner: currentStoreState.winner,
    aiEvaluation: currentStoreState.aiEvaluation,
    currentPhase: currentStoreState.currentPhase
  })

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{index + 1}</span>
    }
  }

  const getRankColor = (index: number, playerId: string) => {
    if (playerId.startsWith("bot")) {
      switch (index) {
        case 0:
          return "bg-gradient-to-r from-blue-400 to-blue-600"
        case 1:
          return "bg-gradient-to-r from-purple-400 to-purple-600"
        case 2:
          return "bg-gradient-to-r from-indigo-400 to-indigo-600"
        default:
          return "bg-gradient-to-r from-gray-400 to-gray-600"
      }
    }

    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600"
      case 1:
        return "bg-gradient-to-r from-gray-300 to-gray-500"
      case 2:
        return "bg-gradient-to-r from-amber-400 to-amber-600"
      default:
        return "bg-gradient-to-r from-blue-400 to-blue-600"
    }
  }

  const handleNextRound = async () => {
    await nextRound()
  }

  const handleGoHome = async () => {
    await leaveRoom()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🎨 게임 결과</h1>
          
          {/* 🔥 디버깅용 버튼 - 개발 중에만 표시 */}
          <div className="mb-4">
            <Button 
              onClick={triggerForceUpdate}
              variant="outline"
              size="sm"
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              🔄 상태 새로고침 (디버그)
            </Button>
          </div>
          
          {aiEvaluation && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white mb-4 inline-flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="text-sm">AI 심사위원이 평가한 결과입니다</span>
            </div>
          )}
          
          {/* 🔥 현재 상태 요약 표시 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white mb-4 text-sm">
            <div>플레이어: {players.length}명 | 점수데이터: {Object.keys(scores).length}개 | AI평가: {aiEvaluation ? '있음' : '없음'}</div>
            <div>Update #{forceUpdate}</div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                  {nickname[0].toUpperCase()}
                </div>
                <div>
                  <span className="font-medium">{nickname}</span>
                  {isHost && (
                    <Badge variant="default" className="ml-2 bg-yellow-500">
                      <Crown className="h-3 w-3 mr-1" />
                      방장
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {aiEvaluation ? (
                  <>
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI 심사 결과 순위
                  </>
                ) : (
                  <>
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    최종 순위
                  </>
                )}
              </CardTitle>
              {aiEvaluation && (
                <p className="text-sm text-gray-600">
                  Gemini AI가 제시어 연관성, 창의성, 완성도를 종합 평가했습니다
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedPlayers.map((player, index) => {
                  const aiRanking = aiEvaluation?.rankings?.find(r => r.playerId === player.id)
                  const displayScore = aiRanking ? aiRanking.score : (scores[player.id] || 0)
                  
                  console.log(`🎨 Rendering player ${index}:`, {
                    player: player.nickname,
                    playerId: player.id,
                    aiRanking,
                    scoreFromStore: scores[player.id],
                    displayScore
                  })
                  
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                        player.id === playerId
                          ? "bg-blue-50 border-2 border-blue-200 shadow-md"
                          : index === 0
                          ? "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200"
                          : index === 1
                          ? "bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200"
                          : index === 2
                          ? "bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {getRankIcon(index)}
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getRankColor(index, player.id)}`}>
                            {player.nickname[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{player.nickname}</span>
                              {player.id === playerId && (
                                <span className="text-sm text-blue-600 font-medium">(나)</span>
                              )}
                              {player.is_host && (
                                <Badge variant="default" className="bg-yellow-500 text-xs">
                                  <Crown className="h-2 w-2 mr-1" />
                                  방장
                                </Badge>
                              )}
                            </div>
                            {aiEvaluation && index === 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Trophy className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs text-yellow-600 font-medium">우승자</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={aiEvaluation ? "default" : "secondary"} 
                          className={`text-lg ${aiEvaluation ? "bg-purple-600" : ""}`}
                        >
                          {displayScore}점
                        </Badge>
                        {aiEvaluation && (
                          <Badge variant="outline" className="text-sm">
                            AI {index + 1}등
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {aiEvaluation && aiEvaluation.comments && aiEvaluation.comments.length > 0 && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-500" />
                  AI 심사위원 코멘트
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  각 작품에 대한 AI의 상세 평가와 피드백입니다
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiEvaluation.rankings
                    ?.sort((a, b) => a.rank - b.rank)
                    .map((ranking) => {
                      const player = players.find(p => p.id === ranking.playerId)
                      const comment = aiEvaluation.comments?.find(c => c.playerId === ranking.playerId)
                      
                      if (!player || !comment) return null
                      
                      return (
                        <div
                          key={ranking.playerId}
                          className={`p-4 rounded-lg border-l-4 transition-all ${
                            ranking.playerId === playerId
                              ? "bg-blue-50 border-l-blue-500 shadow-md"
                              : ranking.rank === 1
                              ? "bg-yellow-50 border-l-yellow-400"
                              : ranking.rank === 2
                              ? "bg-gray-50 border-l-gray-400"
                              : ranking.rank === 3
                              ? "bg-orange-50 border-l-orange-400"
                              : "bg-gray-50 border-l-gray-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getRankColor(ranking.rank - 1, player.id)}`}>
                                {player.nickname[0].toUpperCase()}
                              </div>
                              <div className="text-center mt-1">
                                {ranking.rank === 1 ? (
                                  <Trophy className="h-4 w-4 text-yellow-500 mx-auto" />
                                ) : ranking.rank === 2 ? (
                                  <Medal className="h-4 w-4 text-gray-500 mx-auto" />
                                ) : ranking.rank === 3 ? (
                                  <Award className="h-4 w-4 text-orange-500 mx-auto" />
                                ) : (
                                  <span className="text-xs text-gray-500 font-bold">{ranking.rank}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{player.nickname}</span>
                                {ranking.playerId === playerId && (
                                  <span className="text-sm text-blue-600 font-medium">(나)</span>
                                )}
                                <Badge variant="outline" className="text-sm">
                                  {ranking.rank}등
                                </Badge>
                                <Badge variant="default" className="text-sm bg-purple-600">
                                  {ranking.score}점
                                </Badge>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3 border">
                                <p className="text-gray-700 leading-relaxed">
                                  {comment.comment}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-800 mb-2">AI 평가 기준</h4>
                      <div className="space-y-1 text-sm text-purple-700">
                        <div className="flex justify-between">
                          <span>• 제시어 연관성</span>
                          <span className="font-medium">50%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• 창의성 & 독창성</span>
                          <span className="font-medium">30%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• 완성도 & 기술</span>
                          <span className="font-medium">20%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!aiEvaluation && (
            <Card className="bg-white/95 backdrop-blur-sm border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-amber-700">
                  <Bot className="h-5 w-5" />
                  <p className="text-sm">
                    이번 라운드는 AI 평가 없이 기본 점수로 순위가 결정되었습니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            {isHost ? (
              <Button onClick={handleNextRound} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
                <RotateCcw className="h-4 w-4 mr-2" />
                다음 라운드
              </Button>
            ) : (
              <Card className="flex-1 bg-white/95 backdrop-blur-sm">
                <CardContent className="p-4 text-center text-gray-600">
                  <Crown className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
                  방장이 다음 라운드를 시작할 때까지 기다려주세요...
                </CardContent>
              </Card>
            )}

            <Button onClick={() => setShowLeaveAlert(true)} variant="outline" size="lg" className="bg-white/90">
              <Home className="h-4 w-4 mr-2" />
              방 나가기
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showLeaveAlert} onOpenChange={setShowLeaveAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 방을 나가시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              방을 나가면 다시 입장하기 위해서는 방 번호를 다시 입력해야 합니다.
              {isHost && " 방장 권한은 다른 플레이어에게 넘어갑니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleGoHome}>나가기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
