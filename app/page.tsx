"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Palette, Users, Plus } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import { useToast } from "@/hooks/use-toast"

export default function HomePage() {
  const router = useRouter()
  const { setNickname, createRoom, joinRoom, setRoomId, setIsHost } = useGameStore()
  const { toast } = useToast()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [roomNumber, setRoomNumber] = useState("")
  const [nicknameInput, setNicknameInput] = useState("")
  const [isJoining, setIsJoining] = useState(false)

  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

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
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full p-4 shadow-lg">
              <Palette className="h-12 w-12 text-purple-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">그림 맞히기</h1>
          <p className="text-white/80">친구들과 함께 그림을 그리고 AI가 채점해요!</p>
        </div>

        <div className="space-y-4">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Users className="h-5 w-5" />방 참여하기
              </CardTitle>
              <CardDescription>6자리 방 번호를 입력해서 게임에 참여하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowJoinModal(true)} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                방 참여하기
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Plus className="h-5 w-5" />방 생성하기
              </CardTitle>
              <CardDescription>새로운 게임방을 만들고 친구들을 초대하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                방 생성하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 방 참여 모달 */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>방 참여하기</DialogTitle>
            <DialogDescription>닉네임과 방 번호를 입력해주세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                placeholder="닉네임을 입력하세요"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={10}
              />
            </div>
            <div>
              <Label htmlFor="roomNumber">방 번호 (6자리)</Label>
              <Input
                id="roomNumber"
                placeholder="123456"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleJoinRoom}
              disabled={!nicknameInput.trim() || roomNumber.length !== 6 || isJoining}
              className="w-full"
            >
              {isJoining ? "참여 중..." : "방 참여하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 방 생성 모달 */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>방 생성하기</DialogTitle>
            <DialogDescription>닉네임을 입력하고 새로운 게임방을 만드세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="createNickname">닉네임</Label>
              <Input
                id="createNickname"
                placeholder="닉네임을 입력하세요"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={10}
              />
            </div>
            <Button onClick={handleCreateRoom} disabled={!nicknameInput.trim() || isJoining} className="w-full">
              {isJoining ? "생성 중..." : "방 생성하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
