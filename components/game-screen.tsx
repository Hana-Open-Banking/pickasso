"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Palette, RotateCcw, Send } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import Canvas from "@/components/canvas"
import ColorPalette from "@/components/color-palette"

export default function GameScreen() {
  const { keyword, players, submitDrawing, timeLeft } = useGameStore()
  const [canvasData, setCanvasData] = useState<string>("")
  const [currentColor, setCurrentColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(5)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (canvasData && !isSubmitted) {
      await submitDrawing(canvasData)
      setIsSubmitted(true)
    }
  }

  const handleClearCanvas = () => {
    // Canvas 컴포넌트에서 처리
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
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-500" />
                  <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500" : "text-gray-800"}`}>
                    {timeLeft}초
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* 왼쪽: 참가자 목록 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">참가자</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-2 rounded-lg text-sm ${
                        player.hasSubmitted ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            player.id.startsWith("bot")
                              ? "bg-gradient-to-r from-blue-400 to-purple-400"
                              : "bg-gradient-to-r from-purple-400 to-pink-400"
                          }`}
                        >
                          {player.nickname[0].toUpperCase()}
                        </div>
                        <span className="truncate">{player.nickname}</span>
                        {player.id.startsWith("bot") && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">AI</span>
                        )}
                      </div>
                      {player.hasSubmitted && <p className="text-xs mt-1">제출 완료</p>}
                      {player.id.startsWith("bot") && !player.hasSubmitted && (
                        <p className="text-xs mt-1">그리는 중...</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 가운데: 캔버스 */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>그림 그리기</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleClearCanvas} disabled={isSubmitted}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      초기화
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!canvasData || isSubmitted}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {isSubmitted ? "제출 완료" : "제출하기"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Canvas
                  color={currentColor}
                  brushSize={brushSize}
                  onCanvasChange={setCanvasData}
                  disabled={isSubmitted}
                />
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 팔레트 */}
          <div className="lg:col-span-3">
            <Card>
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
                  disabled={isSubmitted}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
