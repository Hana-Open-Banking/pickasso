"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Crown, Copy, Check } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import { useState } from "react"

export default function LobbyScreen() {
  const { roomId, players, isHost, startGame } = useGameStore()
  const [copied, setCopied] = useState(false)

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = async () => {
    await startGame()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">게임 대기방</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-white text-lg">방 번호:</span>
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/90">
              {roomId}
            </Badge>
            <Button variant="ghost" size="sm" onClick={copyRoomId} className="text-white hover:bg-white/20">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-white/80">친구들에게 방 번호를 공유해서 초대하세요!</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                참가자 목록 ({players.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                        {player.nickname[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{player.nickname}</span>
                    </div>
                    {player.isHost && (
                      <Badge variant="default" className="bg-yellow-500">
                        <Crown className="h-3 w-3 mr-1" />
                        방장
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>게임 규칙</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">📝 게임 방법</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 제시된 단어에 맞는 그림을 그려주세요</li>
                  <li>• 제한 시간은 60초입니다</li>
                  <li>• AI가 그림을 채점해서 점수를 매깁니다</li>
                  <li>• 가장 높은 점수를 받은 사람이 승리!</li>
                </ul>
              </div>

              {isHost && (
                <div className="pt-4 border-t">
                  <Button onClick={handleStartGame} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                    게임 시작하기
                  </Button>
                  <p className="text-sm text-gray-600 mt-2 text-center">AI 봇들과 함께 게임을 즐겨보세요! 🤖</p>
                </div>
              )}

              {!isHost && (
                <div className="pt-4 border-t text-center">
                  <p className="text-gray-600">방장이 게임을 시작할 때까지 기다려주세요...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
