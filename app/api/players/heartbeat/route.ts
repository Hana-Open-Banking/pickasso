import { NextRequest, NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    console.log(`[HEARTBEAT API] Received heartbeat request at ${new Date().toISOString()}`)

    const body = await request.json()

    // Extract basic and extended information
    const { roomId, playerId, timestamp, connectionStatus, reconnecting } = body

    console.log(`[HEARTBEAT API] Request body:`, {
      roomId,
      playerId,
      timestamp,
      connectionStatus,
      reconnecting,
      clientTime: timestamp ? new Date(timestamp).toISOString() : 'not provided',
      serverTime: new Date().toISOString(),
      timeDiff: timestamp ? Date.now() - new Date(timestamp).getTime() : 'unknown'
    })

    if (!roomId || !playerId) {
      console.log(`[HEARTBEAT API] Missing required fields: roomId=${roomId}, playerId=${playerId}`)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[HEARTBEAT API] Processing heartbeat for player ${playerId} in room ${roomId} (connection: ${connectionStatus || 'unknown'}, reconnecting: ${reconnecting || false})`)

    // Get player info before update
    const playerBefore = GameManager.getRoomPlayers(roomId).find(p => p.id === playerId)

    if (!playerBefore) {
      console.log(`[HEARTBEAT API] WARNING: Player ${playerId} not found in room ${roomId} before update`)
      // Check if player exists in any room
      const allPlayers = GameManager.getAllPlayers()
      const playerInAnyRoom = allPlayers.find(p => p.id === playerId)

      if (playerInAnyRoom) {
        console.log(`[HEARTBEAT API] Player ${playerId} found in room ${playerInAnyRoom.room_id} instead of ${roomId}`)

        // If player exists but in a different room, this might indicate a stale client state
        // Log detailed information to help diagnose the issue
        console.log(`[HEARTBEAT API] Potential stale client state detected:`, {
          requestedRoom: roomId,
          actualRoom: playerInAnyRoom.room_id,
          playerDetails: {
            id: playerInAnyRoom.id,
            nickname: playerInAnyRoom.nickname,
            is_host: playerInAnyRoom.is_host,
            last_active: playerInAnyRoom.last_active,
            joined_at: playerInAnyRoom.joined_at,
            inactive_time_ms: Date.now() - new Date(playerInAnyRoom.last_active || playerInAnyRoom.joined_at).getTime()
          }
        })
      } else {
        console.log(`[HEARTBEAT API] Player ${playerId} not found in any room`)
      }

      // Still try to update activity in case there's a race condition
    } else {
      const inactiveTime = Date.now() - new Date(playerBefore.last_active || playerBefore.joined_at).getTime()
      console.log(`[HEARTBEAT API] Player before update:`, {
        id: playerBefore.id,
        nickname: playerBefore.nickname,
        room_id: playerBefore.room_id,
        is_host: playerBefore.is_host,
        last_active: playerBefore.last_active,
        joined_at: playerBefore.joined_at,
        inactive_time_ms: inactiveTime,
        inactive_time_readable: `${Math.floor(inactiveTime / 1000)}s`
      })

      // If player is a host and has been inactive for a while, log a warning
      if (playerBefore.is_host && inactiveTime > 20000) { // 20 seconds
        console.log(`[HEARTBEAT API] WARNING: Host ${playerId} has been inactive for ${Math.floor(inactiveTime / 1000)}s, but is now sending a heartbeat`)
      }
    }

    // Update player activity with retry logic
    let updateSuccess = false
    let retryCount = 0
    const maxRetries = 3

    while (!updateSuccess && retryCount < maxRetries) {
      try {
        GameManager.updatePlayerActivity(playerId)
        updateSuccess = true
      } catch (updateError) {
        retryCount++
        console.error(`[HEARTBEAT API] Error updating activity (attempt ${retryCount}/${maxRetries}):`, updateError)

        if (retryCount < maxRetries) {
          // Wait a short time before retrying
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
        } else {
          throw updateError // Re-throw if all retries failed
        }
      }
    }

    // Get player info after update
    const playerAfter = GameManager.getRoomPlayers(roomId).find(p => p.id === playerId)

    if (!playerAfter) {
      console.log(`[HEARTBEAT API] WARNING: Player ${playerId} not found in room ${roomId} after update`)

      // Check if player exists in any room after update
      const allPlayersAfter = GameManager.getAllPlayers()
      const playerInAnyRoomAfter = allPlayersAfter.find(p => p.id === playerId)

      if (playerInAnyRoomAfter) {
        console.log(`[HEARTBEAT API] After update, player ${playerId} found in room ${playerInAnyRoomAfter.room_id} instead of ${roomId}`)
      } else {
        console.log(`[HEARTBEAT API] After update, player ${playerId} not found in any room`)
      }
    } else {
      const inactiveTime = Date.now() - new Date(playerAfter.last_active || playerAfter.joined_at).getTime()
      console.log(`[HEARTBEAT API] Player after update:`, {
        id: playerAfter.id,
        nickname: playerAfter.nickname,
        room_id: playerAfter.room_id,
        is_host: playerAfter.is_host,
        last_active: playerAfter.last_active,
        joined_at: playerAfter.joined_at,
        inactive_time_ms: inactiveTime,
        inactive_time_readable: `${Math.floor(inactiveTime / 1000)}s`
      })
    }

    const processingTime = Date.now() - startTime
    console.log(`[HEARTBEAT API] Heartbeat processed successfully for player ${playerId} in room ${roomId} in ${processingTime}ms`)

    // Check if this player was previously marked as potentially inactive
    if (playerBefore?.is_host) {
      const hostKey = `${roomId}:${playerId}`
      const potentiallyInactiveHosts = GameManager.getPotentiallyInactiveHosts()

      if (potentiallyInactiveHosts.has(hostKey)) {
        const inactiveRecord = potentiallyInactiveHosts.get(hostKey)
        console.log(`[HEARTBEAT API] Host ${playerId} was previously marked as potentially inactive (count: ${inactiveRecord?.count}), but is now sending a heartbeat`)
      }
    }

    return NextResponse.json({ 
      success: true,
      processingTime,
      timestamp: new Date().toISOString(),
      playerFound: !!playerAfter,
      isHost: playerAfter?.is_host || false
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`[HEARTBEAT API] Error updating player activity (after ${processingTime}ms):`, error)
    return NextResponse.json({ 
      error: "Failed to update activity", 
      processingTime,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
