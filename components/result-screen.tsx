"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, RotateCcw, Home } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import { useRouter } from "next/navigation"

export default function ResultScreen() {
  const { players, scores, winner, isHost, nextRound, resetGame } = useGameStore()
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

  const handleGoHome = () => {
    resetGame()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">게임 결과</h1>
          <p className="text-white/80">AI가 채점한 결과입니다!</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-center">🏆 순위표</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg ${
                    player.id === winner
                      ? "bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getRankIcon(index)}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getRankColor(index, player.id)}`}
                        >
                          {player.nickname[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{player.nickname}</p>
                            {player.id.startsWith("bot") && (
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">AI</span>
                            )}
                          </div>
                          {player.id === winner && (
                            <Badge variant="default" className="bg-yellow-500 text-yellow-900">
                              🏆 우승자
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">{scores[player.id] || 0}점</p>
                      <p className="text-sm text-gray-600">#{index + 1}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          {isHost && (
            <Button onClick={handleNextRound} className="bg-green-600 hover:bg-green-700" size="lg">
              <RotateCcw className="h-5 w-5 mr-2" />
              다음 라운드
            </Button>
          )}

          <Button onClick={handleGoHome} variant="outline" className="bg-white/90 hover:bg-white" size="lg">
            <Home className="h-5 w-5 mr-2" />
            홈으로
          </Button>
        </div>

        {!isHost && (
          <div className="text-center mt-4">
            <p className="text-white/80">방장이 다음 라운드를 시작할 때까지 기다려주세요...</p>
          </div>
        )}
      </div>
    </div>
  )
}
