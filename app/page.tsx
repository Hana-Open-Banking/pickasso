"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Users, Plus } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function HomePage() {
  const router = useRouter()
  const { setNickname, createRoom, joinRoom, setRoomId, setIsHost, setModelType } = useGameStore()
  const { toast } = useToast()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [roomNumber, setRoomNumber] = useState("")
  const [nicknameInput, setNicknameInput] = useState("")
  const [selectedModel, setSelectedModel] = useState<"gemini" | "chatgpt" | "claude">("gemini")
  const [isJoining, setIsJoining] = useState(false)

  const handleJoinRoom = async () => {
    if (!nicknameInput.trim() || !roomNumber.trim()) return

    setIsJoining(true)
    setNickname(nicknameInput.trim())

    const result = await joinRoom(roomNumber)
    if (result.success) {
      setRoomId(roomNumber)
      setIsHost(false)
      router.push(`/room/${roomNumber}`)
    } else {
      toast({
        title: "방 참여 실패",
        description: result.error || "방 참여에 실패했습니다. 방 번호를 확인해주세요.",
        variant: "destructive",
      })
      setIsJoining(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!nicknameInput.trim()) return

    setIsJoining(true)
    setNickname(nicknameInput.trim())
    setModelType(selectedModel)

    const roomId = await createRoom()
    if (roomId) {
      setRoomId(roomId)
      setIsHost(true)
      router.push(`/room/${roomId}`)
    } else {
      toast({
        title: "방 생성 실패",
        description: "방 생성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-pink-100 to-yellow-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6 relative h-40">
            <Image
              src="/pickasso-logo.png"
              alt="Pickasso Logo"
              width={250}
              height={250}
              className="drop-shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2 font-[Pretendard]">PICKASSO</h1>
          <p className="text-gray-600 font-medium">친구들과 함께 그림을 그리고 AI가 채점해요! 🎨</p>
        </div>

        <div className="space-y-4">
          <Card className="border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2 text-blue-600">
                <Users className="h-5 w-5" />방 참여하기
              </CardTitle>
              <CardDescription className="text-gray-600">6자리 방 번호를 입력해서 게임에 참여하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowJoinModal(true)} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200" 
                size="lg"
              >
                방 참여하기
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-200 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2 text-pink-600">
                <Plus className="h-5 w-5" />방 만들기
              </CardTitle>
              <CardDescription className="text-gray-600">새로운 게임방을 만들고 친구들을 초대하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
              >
                방 만들기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 방 참여 모달 */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="sm:max-w-[425px] border-2 border-blue-200">
          <DialogHeader>
            <DialogTitle className="text-blue-600 text-xl">방 참여하기</DialogTitle>
            <DialogDescription className="text-gray-600">닉네임과 방 번호를 입력해주세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-gray-700">닉네임</Label>
              <Input
                id="nickname"
                placeholder="닉네임을 입력하세요"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={10}
                className="border-2 border-blue-100 focus:border-blue-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomNumber" className="text-gray-700">방 번호 (6자리)</Label>
              <Input
                id="roomNumber"
                placeholder="123456"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="border-2 border-blue-100 focus:border-blue-300"
              />
            </div>
            <Button
              onClick={handleJoinRoom}
              disabled={!nicknameInput.trim() || roomNumber.length !== 6 || isJoining}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isJoining ? "참여 중..." : "방 참여하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 방 생성 모달 */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px] border-2 border-pink-200">
          <DialogHeader>
            <DialogTitle className="text-pink-600 text-xl">방 만들기</DialogTitle>
            <DialogDescription className="text-gray-600">닉네임을 입력하고 새로운 게임방을 만드세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="createNickname" className="text-gray-700">닉네임</Label>
              <Input
                id="createNickname"
                placeholder="닉네임을 입력하세요"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={10}
                className="border-2 border-pink-100 focus:border-pink-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelType" className="text-gray-700">AI 모델 선택</Label>
              <Select
                value={selectedModel}
                onValueChange={(value) => setSelectedModel(value as "gemini" | "chatgpt" | "claude")}
              >
                <SelectTrigger className="w-full border-2 border-pink-100 focus:border-pink-300">
                  <SelectValue placeholder="AI 모델을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="chatgpt">OpenAI ChatGPT</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                선택한 AI 모델이 그림을 평가합니다. 각 모델은 다른 특성을 가지고 있습니다.
              </p>
            </div>
            <Button
              onClick={handleCreateRoom}
              disabled={!nicknameInput.trim() || isJoining}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isJoining ? "생성 중..." : "방 만들기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
