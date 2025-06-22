import { type NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId } = await request.json()

    console.log(`Player ${playerId} leaving room ${roomId}`)

    if (!roomId || !playerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 방장인지 확인
    const players = GameManager.getRoomPlayers(roomId)
    const leavingPlayer = players.find(p => p.id === playerId)
    
    if (!leavingPlayer) {
      return NextResponse.json({ error: "Player not found in room" }, { status: 404 })
    }

    const isHost = leavingPlayer.is_host
    const remainingPlayers = players.filter(p => p.id !== playerId)

    if (isHost) {
      // 방장이 나가는 경우
      if (remainingPlayers.length === 0) {
        // 남은 플레이어가 없으면 방 삭제
        console.log(`Host ${playerId} left room ${roomId}, no players remaining, deleting room`)
        GameManager.removePlayer(roomId, playerId)
        GameManager.deleteRoom(roomId)
        GameManager.addGameEvent(roomId, "host_left", { 
          playerId, 
          roomDeleted: true,
          leavingPlayerNickname: leavingPlayer.nickname 
        })
      } else {
        // 남은 플레이어가 있으면 방장 위임 (플레이어 제거 전에 새로운 방장 찾기)
        const newHostId = GameManager.findNewHost(roomId)
        if (newHostId) {
          console.log(`Host ${playerId} left room ${roomId}, transferring to ${newHostId}`)
          
          // 먼저 방장 위임
          GameManager.transferHost(roomId, newHostId)
          
          // 그 다음 플레이어 제거
          GameManager.removePlayer(roomId, playerId)
          
          const newHost = remainingPlayers.find(p => p.id === newHostId)
          console.log(`Host successfully transferred to ${newHostId} (${newHost?.nickname})`)
          GameManager.addGameEvent(roomId, "host_transferred", { 
            oldHostId: playerId, 
            oldHostNickname: leavingPlayer.nickname,
            newHostId, 
            newHostNickname: newHost?.nickname 
          })
        } else {
          console.error(`Failed to find new host for room ${roomId}`)
          GameManager.removePlayer(roomId, playerId)
        }
      }
    } else {
      // 일반 참여자가 나가는 경우
      console.log(`Player ${playerId} left room ${roomId}`)
      GameManager.removePlayer(roomId, playerId)
      GameManager.addGameEvent(roomId, "player_left", { 
        playerId,
        playerNickname: leavingPlayer.nickname 
      })
    }

    return NextResponse.json({ success: true, isHost })
  } catch (error) {
    console.error("Error leaving room:", error)
    return NextResponse.json({ error: "Failed to leave room" }, { status: 500 })
  }
} 