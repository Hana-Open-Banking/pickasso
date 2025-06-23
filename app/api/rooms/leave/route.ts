import { type NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"
import db from "@/lib/db"

interface Player {
  id: string
  nickname: string
  is_host: boolean
  room_id: string
  joined_at: string
}

export async function POST(request: NextRequest) {
  console.log("\n=== LEAVE ROOM API CALLED ===", new Date().toISOString())
  try {
    const { roomId, playerId } = await request.json()
    console.log("[LEAVE] Request body:", { roomId, playerId })

    // 현재 방의 플레이어 목록 가져오기
    console.log("[LEAVE] Fetching current players...")
    const currentPlayers = GameManager.getRoomPlayers(roomId)
    console.log("[LEAVE] Current players in room:", currentPlayers.map((p: Player) => ({
      id: p.id,
      nickname: p.nickname,
      is_host: p.is_host,
      joined_at: p.joined_at
    })))

    // 나가는 플레이어가 방장인지 확인
    const leavingPlayer = currentPlayers.find((p: Player) => p.id === playerId)
    const isHost = leavingPlayer?.is_host === true
    console.log("[LEAVE] Leaving player details:", {
      id: leavingPlayer?.id,
      nickname: leavingPlayer?.nickname,
      is_host: leavingPlayer?.is_host,
      joined_at: leavingPlayer?.joined_at
    })

    if (isHost) {
      console.log("[LEAVE] Host is leaving, starting host transfer process...")
      // 남은 플레이어들 중에서 새로운 방장 선택
      const remainingPlayers = currentPlayers.filter((p: Player) => p.id !== playerId)
      console.log("[LEAVE] Remaining players after host leaves:", remainingPlayers.map((p: Player) => ({
        id: p.id,
        nickname: p.nickname,
        is_host: p.is_host,
        joined_at: p.joined_at
      })))

      if (remainingPlayers.length > 0) {
        console.log("[LEAVE] Found remaining players, proceeding with host transfer...")
        // 가장 먼저 들어온 플레이어를 새로운 방장으로 선택
        const newHost = remainingPlayers[0]
        console.log("[LEAVE] Selected new host:", {
          id: newHost.id,
          nickname: newHost.nickname,
          is_host: newHost.is_host,
          joined_at: newHost.joined_at
        })

        try {
          console.log("[LEAVE] Step 1: Removing host status from all players...")
          // 모든 플레이어의 is_host를 false로 설정
          const resetHostStmt = db.prepare(`
            UPDATE players
            SET is_host = FALSE
            WHERE room_id = ?
          `)
          resetHostStmt.run(roomId)
          
          console.log("[LEAVE] Step 2: Setting new host...")
          // 새로운 방장 설정
          const setNewHostStmt = db.prepare(`
            UPDATE players
            SET is_host = TRUE
            WHERE id = ? AND room_id = ?
          `)
          setNewHostStmt.run(newHost.id, roomId)

          console.log("[LEAVE] Step 3: Verifying host transfer...")
          const updatedPlayers = GameManager.getRoomPlayers(roomId)
          console.log("[LEAVE] Players after host transfer:", updatedPlayers.map((p: Player) => ({
            id: p.id,
            nickname: p.nickname,
            is_host: p.is_host,
            joined_at: p.joined_at
          })))
        } catch (error: unknown) {
          console.error("[LEAVE] Failed to transfer host:", error)
          throw error
        }
      }
    }

    // 플레이어 제거
    console.log("[LEAVE] Step 4: Removing leaving player from database...")
    const removed = GameManager.removePlayer(roomId, playerId)
    if (!removed) {
      console.error("[LEAVE] Failed to remove player from room")
      throw new Error("Failed to remove player from room")
    }

    const response = { success: true, isHost }
    console.log("[LEAVE] Sending response:", response)
    console.log("=== LEAVE ROOM API COMPLETED ===\n")
    return NextResponse.json(response)
  } catch (error: unknown) {
    console.error("[LEAVE] Error in leave route:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
} 