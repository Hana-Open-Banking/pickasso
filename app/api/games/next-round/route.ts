import { type NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function POST(request: NextRequest) {
  try {
    const { roomId, hostId } = await request.json()

    console.log(`Next round request: roomId=${roomId}, hostId=${hostId}`)

    if (!roomId || !hostId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 방장 권한 확인
    const players = GameManager.getRoomPlayers(roomId)
    const host = players.find((p) => p.id === hostId && p.is_host)
    
    if (!host) {
      // 방장이 없는 경우 새로운 방장 선택
      console.log(`No host found in room ${roomId}, selecting new host`)
      const newHostId = GameManager.findNewHost(roomId)
      if (newHostId) {
        GameManager.transferHost(roomId, newHostId)
        const newHost = players.find(p => p.id === newHostId)
        console.log(`New host selected: ${newHostId} (${newHost?.nickname})`)
        
        // 새로운 방장에게 알림 이벤트 추가
        GameManager.addGameEvent(roomId, "host_transferred", { 
          oldHostId: hostId, 
          newHostId, 
          newHostNickname: newHost?.nickname 
        })
        
        // 새로운 방장으로 다음 라운드 시작
        const keyword = GameManager.nextRound(roomId)
        if (keyword) {
          return NextResponse.json({ success: true, keyword, newHostId })
        }
      }
      return NextResponse.json({ error: "No players available to become host" }, { status: 400 })
    }

    const keyword = GameManager.nextRound(roomId)

    if (!keyword) {
      return NextResponse.json({ error: "Failed to start next round" }, { status: 500 })
    }

    console.log(`Next round started successfully in room ${roomId} with keyword: ${keyword}`)
    return NextResponse.json({ success: true, keyword })
  } catch (error) {
    console.error("Error starting next round:", error)
    return NextResponse.json({ error: "Failed to start next round" }, { status: 500 })
  }
}
