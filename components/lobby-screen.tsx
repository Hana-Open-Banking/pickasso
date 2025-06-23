"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Crown, Copy, Check, Home } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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

export default function LobbyScreen() {
  const { roomId, players, isHost, startGame, leaveRoom, playerId, nickname } = useGameStore()
  const [copied, setCopied] = useState(false)
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)
  const router = useRouter()

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = async () => {
    await startGame()
  }

  const handleLeaveRoom = async () => {
    await leaveRoom()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-pink-100 to-yellow-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6 relative h-40">
            <Image
              src="/pickasso-logo.png"
              alt="Pickasso Logo"
              width={250}
              height={250}
              className="drop-shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4 font-[Pretendard]">게임 대기방</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-gray-700 text-lg">방 번호:</span>
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-white border-2 border-blue-200">
              {roomId}
            </Badge>
            <Button variant="ghost" size="sm" onClick={copyRoomId} className="text-gray-600 hover:bg-blue-100">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-gray-600 font-medium">친구들에게 방 번호를 공유해서 초대하세요! 🎮</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Users className="h-5 w-5" />
                참가자 목록 ({players.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {players.map((player) => (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.id === playerId 
                        ? "bg-blue-50 border-2 border-blue-200" 
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {player.nickname[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">{player.nickname}</span>
                        {player.id === playerId && (
                          <span className="text-sm text-blue-600 ml-2">(나)</span>
                        )}
                      </div>
                    </div>
                    {player.is_host && (
                      <Badge variant="default" className="bg-yellow-400 text-yellow-900">
                        <Crown className="h-3 w-3 mr-1" />
                        방장
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-200 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-pink-600">게임 규칙</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">📝 게임 방법</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                    제시된 단어에 맞는 그림을 그려주세요
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                    제한 시간은 60초입니다
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                    AI가 그림을 채점해서 점수를 매깁니다
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                    가장 높은 점수를 받은 사람이 승리!
                  </li>
                </ul>
              </div>

              {isHost && (
                <div className="pt-4 border-t border-gray-100">
                  <Button 
                    onClick={handleStartGame} 
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200" 
                    size="lg"
                  >
                    게임 시작하기
                  </Button>
                  <p className="text-sm text-gray-600 mt-2 text-center">AI 봇들과 함께 게임을 즐겨보세요! 🤖</p>
                </div>
              )}

              {!isHost && (
                <div className="pt-4 border-t border-gray-100 text-center">
                  <p className="text-gray-600">방장이 게임을 시작할 때까지 기다려주세요... ⏳</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <Button 
                  onClick={() => setShowLeaveAlert(true)} 
                  variant="outline" 
                  className="w-full border-2 border-gray-200 hover:bg-gray-50 transition-colors duration-200" 
                  size="lg"
                >
                  <Home className="h-4 w-4 mr-2" />
                  방 나가기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showLeaveAlert} onOpenChange={setShowLeaveAlert}>
        <AlertDialogContent className="border-2 border-red-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">정말 방을 나가시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              방을 나가면 다시 입장하기 위해서는 방 번호를 다시 입력해야 합니다.
              {isHost && " 방장 권한은 다른 플레이어에게 넘어갑니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-gray-200">취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeaveRoom}
              className="bg-red-500 hover:bg-red-600"
            >
              나가기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
