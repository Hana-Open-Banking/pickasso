"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel"
import { Trophy, Medal, Award, RotateCcw, Home, Crown, Sparkles, Bot, Image as ImageIcon, ExternalLink, Download } from "lucide-react"
import * as htmlToImage from 'html-to-image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useGameStore } from "@/store/game-store"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
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
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [drawings, setDrawings] = useState<Record<string, string>>({})
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
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

  const handleSaveImage = async () => {
    if (!imageContainerRef.current) return

    try {
      console.log("🖼️ 이미지 저장 중...")

      // 저장 전 스타일 조정 (더 나은 이미지 품질을 위해)
      const originalPadding = imageContainerRef.current.style.padding
      const originalBorderRadius = imageContainerRef.current.style.borderRadius

      // 이미지 저장을 위한 스타일 적용
      imageContainerRef.current.style.padding = '20px'
      imageContainerRef.current.style.borderRadius = '12px'

      // 이미지 생성
      const dataUrl = await htmlToImage.toPng(imageContainerRef.current, {
        quality: 0.95,
        pixelRatio: 2, // 고해상도 이미지
        backgroundColor: 'white'
      })

      // 원래 스타일로 복원
      imageContainerRef.current.style.padding = originalPadding
      imageContainerRef.current.style.borderRadius = originalBorderRadius

      // 현재 날짜와 시간을 파일명에 포함
      const now = new Date()
      const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
      const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`

      // 다운로드 링크 생성
      const link = document.createElement('a')
      link.download = `pickasso-${nickname}-${dateStr}${timeStr}.png`
      link.href = dataUrl
      link.click()

      console.log("🖼️ 이미지 저장 완료")
    } catch (error) {
      console.error("Error saving image:", error)
      alert("이미지 저장 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🎨 게임 결과</h1>

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
                  AI가 제시어 연관성, 창의성, 완성도를 종합 평가했습니다
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
                            {index + 1}등
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
              <Button disabled className="flex-1 bg-gray-300 text-gray-600" size="lg">
                방장이 다음 라운드를 시작할 때까지 기다려주세요...
              </Button>
            )}

            <Button onClick={() => setShowLeaveAlert(true)} variant="outline" size="lg" className="bg-white/90">
              <Home className="h-4 w-4 mr-2" />
              방 나가기
            </Button>
          </div>

          {/* 🎨 참가자 그림 갤러리 */}
          {Object.keys(drawings).length > 0 && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                  참가자 작품 갤러리
                </CardTitle>
                <p className="text-sm text-gray-600">참가자들의 작품을 감상해보세요</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-4 right-4 text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                  onClick={() => setShowGalleryModal(true)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  내 작품 소장하기 ❤
                </Button>
  ️            </CardHeader>
              <CardContent>
                <Carousel setApi={setCarouselApi} opts={{ loop: true }} className="w-full">
                  <CarouselContent>
                    {chunkArray(sortedPlayers, 3).map((group, idx) => (
                      <CarouselItem key={idx}>
                        <div className="grid grid-cols-3 gap-4 px-4 py-6">
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

                            // 순위에 따른 테두리 스타일
                            const playerRank = sortedPlayers.findIndex(p => p.id === player.id) + 1
                            const borderClass = 
                              playerRank === 1 ? "border-4 border-yellow-400 shadow-lg shadow-yellow-400/50" :
                              playerRank === 2 ? "border-4 border-gray-400 shadow-lg shadow-gray-400/50" :
                              playerRank === 3 ? "border-4 border-orange-400 shadow-lg shadow-orange-400/50" :
                              "border-2 border-gray-200"

                            return (
                              <div key={player.id} className="flex flex-col items-center">
                                {/* 그림 */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imgSrc}
                                  alt={`${player.nickname} 그림`}
                                  className={`w-full aspect-square object-cover rounded-lg bg-gray-100 ${borderClass}`}
                                />
                                {/* 캡션 */}
                                <div className="mt-3 text-center w-full">
                                  <div className="flex items-center justify-center gap-2 mb-1">
                                    {playerRank <= 3 && (
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                        playerRank === 1 ? "bg-yellow-500" :
                                        playerRank === 2 ? "bg-gray-500" :
                                        "bg-orange-500"
                                      }`}>
                                        {playerRank}
                                      </div>
                                    )}
                                    <div className="font-medium text-gray-800 truncate">
                                      {player.nickname}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 font-medium">{scoreValue}점</div>
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

      {/* 갤러리 모달 - 내 그림만 표시 */}
      <Dialog open={showGalleryModal} onOpenChange={setShowGalleryModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-500" />
              내 그림
            </DialogTitle>
            <DialogDescription>
              내가 그린 그림과 AI의 평가를 확인해보세요
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {(() => {
              // 현재 사용자의 그림과 정보 찾기
              const myPlayer = players.find(p => p.id === currentPlayerId);
              if (!myPlayer) return <div className="text-center py-8">그림 정보를 찾을 수 없습니다.</div>;

              const imgBase = drawings[currentPlayerId];
              const imgSrc = !imgBase
                ? "/placeholder.jpg"
                : imgBase.startsWith("data:")
                ? imgBase // 이미 data URL 형태
                : `data:image/png;base64,${imgBase}`;

              // AI 평가 정보 찾기
              const myRanking = aiEvaluation?.rankings?.find(r => r.playerId === currentPlayerId);
              const myComment = myRanking ? (myRanking as any).comment || "" : "";
              const myScore = myRanking ? myRanking.score : (scores[currentPlayerId] || 0);

              // 순위에 따른 테두리 스타일
              const playerRank = sortedPlayers.findIndex(p => p.id === currentPlayerId) + 1;
              const borderClass = 
                playerRank === 1 ? "border-4 border-yellow-400 shadow-lg shadow-yellow-400/50" :
                playerRank === 2 ? "border-4 border-gray-400 shadow-lg shadow-gray-400/50" :
                playerRank === 3 ? "border-4 border-orange-400 shadow-lg shadow-orange-400/50" :
                "border-2 border-gray-200";

              return (
                <div className="flex flex-col items-center">
                  {/* 이미지와 코멘트를 포함하는 컨테이너 */}
                  <div ref={imageContainerRef} className="flex flex-col items-center bg-white p-6 rounded-lg">
                    {/* 그림 */}
                    <div className="w-full max-w-md mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={`${myPlayer.nickname} 그림`}
                        className={`w-full aspect-square object-contain rounded-lg bg-gray-100 ${borderClass}`}
                      />
                    </div>

                    {/* 사용자 정보 */}
                    <div className="mt-4 text-center w-full">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {playerRank <= 3 && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            playerRank === 1 ? "bg-yellow-500" :
                            playerRank === 2 ? "bg-gray-500" :
                            "bg-orange-500"
                          }`}>
                            {playerRank}
                          </div>
                        )}
                        <div className="font-medium text-gray-800">
                          {myPlayer.nickname}
                        </div>
                        <Badge variant="outline" className="text-sm">
                          {playerRank}등
                        </Badge>
                        <Badge variant="default" className="text-sm bg-purple-600">
                          {myScore}점
                        </Badge>
                      </div>
                    </div>

                    {/* AI 코멘트 */}
                    {myComment && (
                      <div className="mt-6 w-full max-w-md mx-auto">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-5 w-5 text-purple-600" />
                            <h3 className="font-medium text-purple-800">AI 평가 코멘트</h3>
                          </div>
                          <p className="text-gray-700 leading-relaxed">
                            {myComment}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 로컬에 저장하기 버튼 */}
                  <div className="mt-6 w-full max-w-md mx-auto">
                    <Button 
                      onClick={handleSaveImage} 
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      로컬에 저장하기
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
