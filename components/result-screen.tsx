"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, RotateCcw, Home, Crown } from "lucide-react"
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
  const { players, scores, winner, isHost, nextRound, resetGame, leaveRoom, playerId, nickname } = useGameStore()
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)
  const router = useRouter()

  const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))

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

  // getRankColor 함수에 봇 구분 추가:
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
          <h1 className="text-4xl font-bold text-white mb-4">게임 결과</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
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
                <Trophy className="h-5 w-5 text-yellow-500" />
                최종 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {players
                  .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        player.id === playerId
                          ? "bg-blue-50 border-2 border-blue-200"
                          : index === 0
                          ? "bg-yellow-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {index === 0 ? (
                          <Trophy className="h-6 w-6 text-yellow-500" />
                        ) : index === 1 ? (
                          <Medal className="h-6 w-6 text-gray-500" />
                        ) : index === 2 ? (
                          <Award className="h-6 w-6 text-orange-500" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                            {index + 1}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                            {player.nickname[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">{player.nickname}</span>
                            {player.id === playerId && (
                              <span className="text-sm text-blue-600 ml-2">(나)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-lg">
                          {scores[player.id] || 0}점
                        </Badge>
                        {player.is_host && (
                          <Badge variant="default" className="bg-yellow-500">
                            <Crown className="h-3 w-3 mr-1" />
                            방장
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            {isHost ? (
              <Button onClick={handleNextRound} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
                <RotateCcw className="h-4 w-4 mr-2" />
                다음 라운드
              </Button>
            ) : (
              <Card className="flex-1 bg-white/95 backdrop-blur-sm">
                <CardContent className="p-4 text-center text-gray-600">
                  방장이 다음 라운드를 시작할 때까지 기다려주세요...
                </CardContent>
              </Card>
            )}

            <Button onClick={() => setShowLeaveAlert(true)} variant="outline" size="lg">
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
