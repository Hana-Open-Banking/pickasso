"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel"
import { Trophy, Medal, Award, RotateCcw, Home, Crown, Sparkles, Bot, Image as ImageIcon } from "lucide-react"
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
  const currentPlayerId = useGameStore((state) => state.playerId) // ✅ 변수명 변경
  const nickname = useGameStore((state) => state.nickname)
  const aiEvaluation = useGameStore((state) => state.aiEvaluation)
  const roomId = useGameStore((state) => state.roomId)
  const nextRound = useGameStore((state) => state.nextRound)
  const resetGame = useGameStore((state) => state.resetGame)
  const leaveRoom = useGameStore((state) => state.leaveRoom)
  const currentPhase = useGameStore((state) => state.currentPhase)
  
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [drawings, setDrawings] = useState<Record<string, string>>({})
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null)
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
  console.log("🎨 Current Player ID:", currentPlayerId)
  console.log("🎨 Players:", players)
  console.log("🎨 Scores:", scores)
  console.log("🎨 Winner:", winner)
  console.log("🎨 AI Evaluation:", aiEvaluation)
  
  useEffect(() => {
    console.log("🔄 ResultScreen mounted/updated")
    console.log("🔄 Current game state:", {
      currentPlayerId,
      players: players.length,
      scores: Object.keys(scores).length,
      winner: winner,
      aiEvaluation: aiEvaluation ? "present" : "null",
      currentPhase: currentPhase
    })
  }, [])

  // 그림 데이터 불러오기
  useEffect(() => {
    const fetchDrawings = async () => {
      if (!roomId) return
      try {
        const res = await fetch(`/api/rooms/${roomId}/results`)
        if (!res.ok) return
        const data = await res.json()
        if (data && data.drawings) {
          setDrawings(data.drawings as Record<string, string>)
        }
      } catch (error) {
        console.error("Error fetching drawings:", error)
      }
    }
    fetchDrawings()
  }, [roomId])

  // 캐러셀 자동 슬라이드
  useEffect(() => {
    if (!carouselApi) return
    const id = setInterval(() => {
      if (carouselApi.canScrollNext()) {
        carouselApi.scrollNext()
      } else {
        carouselApi.scrollTo(0)
      }
    }, 5000)
    return () => clearInterval(id)
  }, [carouselApi])

  // 배열을 일정 크기로 분할
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const res: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size))
    }
    return res
  }

  const getSortedPlayers = () => {
    console.log("🔍 getSortedPlayers called")
    console.log("🔍 AI Evaluation exists:", !!aiEvaluation)
    console.log("🔍 AI Rankings exists:", !!aiEvaluation?.rankings)
    console.log("🔍 AI Rankings length:", aiEvaluation?.rankings?.length || 0)
    console.log("🔍 Players length:", players.length)
    console.log("🔍 All players:", players)
    
    if (aiEvaluation && aiEvaluation.rankings && aiEvaluation.rankings.length > 0) {
      console.log("🔍 Using AI rankings for sorting")
      // ✅ 원본 배열을 수정하지 않도록 복사본 생성
      const sortedRankings = [...aiEvaluation.rankings].sort((a, b) => a.rank - b.rank)
      console.log("🔍 Sorted AI rankings:", sortedRankings)
      
      // ✅ AI rankings 기반으로 정렬된 플레이어 배열 생성
      const sortedPlayers = sortedRankings.map(ranking => {
        const player = players.find(p => p.id === ranking.playerId)
        if (player) {
          // 정규화된 데이터에서 score와 comment 사용
          const rankScore = ranking.score !== undefined ? ranking.score : (scores[ranking.playerId] || 0)
          return { 
            ...player, 
            aiRank: ranking.rank, 
            aiScore: rankScore,
            aiComment: (ranking as any).comment || ""
          }
        } else {
          console.warn(`⚠️ Player not found for ranking:`, ranking)
          // 플레이어를 찾을 수 없는 경우 기본 객체 반환 (필수 필드 기본값 포함)
          return {
            id: ranking.playerId,
            nickname: `Player ${ranking.playerId}`,
            is_host: false,
            has_submitted: true,
            score: ranking.score || 0,
            aiRank: ranking.rank,
            aiScore: ranking.score || 0,
            aiComment: (ranking as any).comment || ""
          }
        }
      }).filter(player => player !== null)
      
      console.log("🔍 Sorted players by AI ranking:", sortedPlayers)
      
      // ✅ AI rankings에 없는 플레이어들 추가 (혹시 누락된 경우 대비)
      const rankedPlayerIds = new Set(sortedRankings.map(r => r.playerId))
      const unrankedPlayers = players.filter(p => !rankedPlayerIds.has(p.id))
      
      if (unrankedPlayers.length > 0) {
        console.log("🔍 Found unranked players:", unrankedPlayers)
        unrankedPlayers.forEach(player => {
          sortedPlayers.push({
            ...player,
            aiRank: sortedPlayers.length + 1,
            aiScore: scores[player.id] || 0,
            aiComment: ""
          })
        })
      }
      
      return sortedPlayers
    } else {
      console.log("🔍 Using default scores for sorting")
      const sortedByScore = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
      console.log("🔍 Sorted by scores:", sortedByScore)
      return sortedByScore
    }
  }

  const sortedPlayers = getSortedPlayers()

  // 🔍 디버깅: 데이터 상태 확인
  console.log("🔍 Final sorted players:", sortedPlayers)

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 1:
        return <Medal className="h-6 w-6 text-gray-500" />
      case 2:
        return <Award className="h-6 w-6 text-orange-500" />
      default:
        return <span className="text-lg font-bold text-gray-500">{index + 1}</span>
    }
  }

  const getRankColor = (index: number, playerId: string) => {
    if (playerId === currentPlayerId) return "bg-blue-500" // ✅ 수정됨
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-400 to-amber-500"
      case 1:
        return "bg-gradient-to-r from-gray-400 to-slate-500"
      case 2:
        return "bg-gradient-to-r from-orange-400 to-amber-500"
      default:
        return "bg-gradient-to-r from-blue-400 to-purple-500"
    }
  }

  const handleNextRound = async () => {
    console.log("🔄 다음 라운드 시작 중...")
    await nextRound()
  }

  const handleGoHome = async () => {
    console.log("🏠 방 나가기 중...")
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
                  const displayScore = (player as any).aiScore !== undefined ? (player as any).aiScore : (aiRanking ? aiRanking.score : (scores[player.id] || 0))
                  
                  console.log(`🎨 Rendering player ${index}:`, {
                    player: player.nickname,
                    playerId: player.id,
                    aiRanking,
                    aiScore: (player as any).aiScore,
                    scoreFromStore: scores[player.id],
                    displayScore
                  })
                  
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                        player.id === currentPlayerId
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
                              {player.id === currentPlayerId && (
                                <span className="text-sm text-blue-600 font-medium">(나)</span>
                              )}
                              {(player as any).is_host && (
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

          {aiEvaluation && aiEvaluation.rankings && aiEvaluation.rankings.length > 0 && (
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
                {/* 내 코멘트를 먼저 표시 */}
                {(() => {
                  console.log("🎯 Looking for my comment...")
                  console.log("🎯 Current Player ID:", currentPlayerId)
                  console.log("🎯 AI Rankings:", aiEvaluation.rankings)
                  
                  const myRanking = aiEvaluation.rankings?.find(r => {
                    console.log(`🎯 Comparing ${r.playerId} === ${currentPlayerId}:`, r.playerId === currentPlayerId)
                    return r.playerId === currentPlayerId
                  })
                  
                  const myPlayer = players.find(p => p.id === currentPlayerId)
                  
                  console.log("🎯 My ranking found:", myRanking)
                  console.log("🎯 My player found:", myPlayer)
                  
                  if (myRanking && myPlayer) {
                    // ✅ 정규화된 데이터에서 코멘트 가져오기
                    const myComment = (myRanking as any).comment || ""
                    const myScore = myRanking.score !== undefined ? myRanking.score : (scores[currentPlayerId] || 0)
                    
                    console.log("🎯 My comment:", myComment)
                    console.log("🎯 My score:", myScore)
                    
                    return (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">나</span>
                          </div>
                          <h3 className="font-semibold text-blue-700">내 작품 평가</h3>
                        </div>
                        <div className="p-4 rounded-lg border-l-4 border-l-blue-500 bg-blue-50 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm bg-blue-500">
                                {myPlayer.nickname[0].toUpperCase()}
                              </div>
                              <div className="text-center mt-1">
                                {myRanking.rank === 1 ? (
                                  <Trophy className="h-4 w-4 text-yellow-500 mx-auto" />
                                ) : myRanking.rank === 2 ? (
                                  <Medal className="h-4 w-4 text-gray-500 mx-auto" />
                                ) : myRanking.rank === 3 ? (
                                  <Award className="h-4 w-4 text-orange-500 mx-auto" />
                                ) : (
                                  <span className="text-xs text-gray-500 font-bold">{myRanking.rank}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{myPlayer.nickname}</span>
                                <span className="text-sm text-blue-600 font-medium">(나)</span>
                                <Badge variant="outline" className="text-sm">
                                  {myRanking.rank}등
                                </Badge>
                                <Badge variant="default" className="text-sm bg-blue-600">
                                  {myScore}점
                                </Badge>
                              </div>
                              <div className="bg-white/80 rounded-lg p-3 border">
                                <p className="text-gray-700 leading-relaxed font-medium">
                                  {myComment || "AI 평가를 불러오는 중입니다..."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  } else {
                    console.log("🎯 My comment section not rendered - data missing")
                    return null
                  }
                })()}
                
                {/* 다른 참가자들의 코멘트 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <span>다른 참가자들의 평가</span>
                    <span className="text-sm text-gray-500">({aiEvaluation.rankings?.filter(r => r.playerId !== currentPlayerId).length || 0}명)</span>
                  </h3>
                  {aiEvaluation.rankings
                    ?.filter(ranking => ranking.playerId !== currentPlayerId) // 내 코멘트 제외
                    ?.sort((a, b) => a.rank - b.rank)
                    .map((ranking, index) => {
                      const player = players.find(p => p.id === ranking.playerId)
                      // ✅ 정규화된 데이터에서 코멘트 가져오기
                      const comment = (ranking as any).comment || ""
                      const score = ranking.score !== undefined ? ranking.score : (scores[ranking.playerId] || 0)
                      
                      if (!player) {
                        console.warn(`⚠️ No player found for ranking ${ranking.rank}`)
                        return null
                      }
                      
                      return (
                        <div
                          key={`others-${ranking.playerId}`}
                          className={`p-4 rounded-lg border-l-4 transition-all ${
                            ranking.rank === 1
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
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                ranking.rank === 1 ? "bg-gradient-to-r from-yellow-400 to-amber-500" :
                                ranking.rank === 2 ? "bg-gradient-to-r from-gray-400 to-slate-500" :
                                ranking.rank === 3 ? "bg-gradient-to-r from-orange-400 to-amber-500" :
                                "bg-gradient-to-r from-blue-400 to-purple-500"
                              }`}>
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
                                <Badge variant="outline" className="text-sm">
                                  {ranking.rank}등
                                </Badge>
                                <Badge variant="default" className="text-sm bg-purple-600">
                                  {score}점
                                </Badge>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3 border">
                                <p className="text-gray-700 leading-relaxed">
                                  {comment || "AI 평가 코멘트를 불러오는 중입니다..."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
                
                {/* AI 심사위원 종합 해설 */}
                {aiEvaluation?.summary && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex items-start gap-3">
                      <Bot className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-purple-900 mb-2">AI 심사위원의 종합 평가</h3>
                        <p className="text-gray-700 leading-relaxed">{aiEvaluation.summary}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 평가 기준 설명 */}
                {aiEvaluation?.evaluationCriteria && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <Trophy className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-2">📋 평가 기준</h3>
                        <p className="text-gray-600 leading-relaxed text-sm">{aiEvaluation.evaluationCriteria}</p>
                      </div>
                    </div>
                  </div>
                )}
                
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

          {/* 🎨 참가자 그림 갤러리 */}
          {Object.keys(drawings).length > 0 && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                  참가자 작품 갤러리
                </CardTitle>
                <p className="text-sm text-gray-600">최대 3개 씩 작품을 감상해보세요</p>
              </CardHeader>
              <CardContent>
                <Carousel setApi={setCarouselApi} opts={{ loop: true }} className="w-full">
                  <CarouselContent>
                    {chunkArray(sortedPlayers, 3).map((group, idx) => (
                      <CarouselItem key={idx} className="px-2">
                        <div className="flex justify-center gap-6 py-4">
                          {group.map((player) => {
                            const imgBase = drawings[player.id]
                            const imgSrc = !imgBase
                              ? "/placeholder.jpg"
                              : imgBase.startsWith("data:")
                              ? imgBase // 이미 data URL 형태
                              : `data:image/png;base64,${imgBase}`
                            const scoreValue =
                              (player as any).aiScore !== undefined
                                ? (player as any).aiScore
                                : scores[player.id] || 0
                            return (
                              <div key={player.id} className="flex flex-col items-center w-48">
                                {/* 그림 */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imgSrc}
                                  alt={`${player.nickname} 그림`}
                                  className="w-48 h-48 object-contain rounded-lg border shadow-md bg-gray-100"
                                />
                                {/* 캡션 */}
                                <div className="mt-2 text-center">
                                  <div className="font-medium text-gray-800 truncate">
                                    {player.nickname}
                                  </div>
                                  <div className="text-sm text-gray-600">{scoreValue}점</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="bg-white/80 backdrop-blur-sm" />
                  <CarouselNext className="bg-white/80 backdrop-blur-sm" />
                </Carousel>
              </CardContent>
            </Card>
          )}
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