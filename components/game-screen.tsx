"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Palette, RotateCcw, Send, Home, Crown } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import Canvas from "@/components/canvas"
import ColorPalette from "@/components/color-palette"
import { useRouter } from "next/navigation"
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

export default function GameScreen() {
  const { keyword, players, submitDrawing, timeLeft, currentPhase, leaveRoom, isHost, playerId, nickname } = useGameStore()
  const [canvasData, setCanvasData] = useState<string>("")
  const [currentColor, setCurrentColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(5)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)
  const router = useRouter()

  // drawing 단계로 변경될 때 제출 상태 초기화
  useEffect(() => {
    if (currentPhase === "drawing") {
      setIsSubmitted(false)
      setCanvasData("")
    }
  }, [currentPhase])

  const handleSubmit = async () => {
    console.log("Submit button clicked, canvasData length:", canvasData?.length || 0)
    if (!isSubmitted) {
      console.log("Submitting drawing...")
      setIsSubmitted(true)
      await submitDrawing(canvasData)
    } else {
      console.log("Already submitted")
    }
  }

  const handleClearCanvas = () => {
    // Canvas 컴포넌트에서 전역 함수로 접근
    const canvas = document.querySelector('canvas')
    if (canvas && (canvas as any).clearCanvas) {
      (canvas as any).clearCanvas()
      setCanvasData("")
    }
  }

  const handleLeaveRoom = async () => {
    await leaveRoom()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 상단 정보 */}
        <div className="mb-6">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">제시어</p>
                    <Badge variant="default" className="text-lg px-4 py-2 bg-blue-600">
                      {keyword}
                    </Badge>
                  </div>
                  <div className="border-l pl-4 ml-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                        {nickname[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium">{nickname}</span>
                        {isHost && (
                          <Badge variant="default" className="ml-2 bg-yellow-500">
                            방장
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-red-500" />
                    <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500" : "text-gray-800"}`}>
                      {timeLeft}초
                    </span>
                  </div>
                  
                  <Button 
                    onClick={() => setShowLeaveAlert(true)} 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <Home className="h-4 w-4 mr-1" />
                    방 나가기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 캔버스 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 왼쪽: 참가자 목록 */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">참가자</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-2 rounded-lg text-sm ${
                        player.has_submitted ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            player.id === playerId
                              ? "bg-gradient-to-r from-blue-400 to-blue-600"
                              : "bg-gradient-to-r from-purple-400 to-pink-400"
                          }`}
                        >
                          {player.nickname[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{player.nickname}</span>
                            {player.id === playerId && (
                              <span className="text-xs text-blue-600">(나)</span>
                            )}
                          </div>
                          {player.has_submitted && (
                            <p className="text-xs mt-0.5 text-green-600">제출 완료</p>
                          )}
                        </div>
                        {player.is_host && (
                          <Badge variant="default" className="bg-yellow-500">
                            <Crown className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 가운데: 캔버스 */}
          <div className="lg:col-span-7">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <Canvas
                  color={currentColor}
                  brushSize={brushSize}
                  onCanvasChange={setCanvasData}
                  disabled={isSubmitted}
                />
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 도구 */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* 색상 팔레트 */}
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    도구
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ColorPalette
                    currentColor={currentColor}
                    onColorChange={setCurrentColor}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                  />
                </CardContent>
              </Card>

              {/* 컨트롤 버튼들 */}
              <div className="space-y-3">
                <Button
                  onClick={handleClearCanvas}
                  variant="outline"
                  className="w-full"
                  disabled={isSubmitted}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  지우기
                </Button>

                <Button
                  onClick={handleSubmit}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isSubmitted}
                >
                  <Send className="h-4 w-4 mr-2" />
                  제출하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showLeaveAlert} onOpenChange={setShowLeaveAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 방을 나가시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              게임 진행 중에 나가면 점수를 얻을 수 없습니다.
              {isHost && " 방장 권한은 다른 플레이어에게 넘어갑니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveRoom}>나가기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
