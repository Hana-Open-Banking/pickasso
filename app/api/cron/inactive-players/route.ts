import { NextResponse } from "next/server"
import { GameManager } from "@/lib/game-manager"

export async function GET() {
  try {
    console.log("[CRON API] Starting inactive players check...")

    // Get all rooms before check
    const roomsBefore = GameManager.getAllRooms()
    console.log(`[CRON API] Rooms before check: ${roomsBefore.length}`)

    // Get all players before check
    let totalPlayersBefore = 0
    let totalHostsBefore = 0
    for (const room of roomsBefore) {
      const players = GameManager.getRoomPlayers(room.id)
      totalPlayersBefore += players.length
      totalHostsBefore += players.filter(p => p.is_host).length
    }
    console.log(`[CRON API] Total players before check: ${totalPlayersBefore}, hosts: ${totalHostsBefore}`)

    // Start time for performance measurement
    const startTime = Date.now()

    // Check for inactive players
    GameManager.checkInactivePlayers()

    // End time for performance measurement
    const endTime = Date.now()
    console.log(`[CRON API] Inactive players check completed in ${endTime - startTime}ms`)

    // Get all rooms after check
    const roomsAfter = GameManager.getAllRooms()
    console.log(`[CRON API] Rooms after check: ${roomsAfter.length}`)

    // Get all players after check
    let totalPlayersAfter = 0
    let totalHostsAfter = 0
    for (const room of roomsAfter) {
      const players = GameManager.getRoomPlayers(room.id)
      totalPlayersAfter += players.length
      totalHostsAfter += players.filter(p => p.is_host).length
    }
    console.log(`[CRON API] Total players after check: ${totalPlayersAfter}, hosts: ${totalHostsAfter}`)

    // Check for changes
    const roomsChanged = roomsBefore.length !== roomsAfter.length
    const playersChanged = totalPlayersBefore !== totalPlayersAfter
    const hostsChanged = totalHostsBefore !== totalHostsAfter

    console.log(`[CRON API] Changes detected: rooms=${roomsChanged}, players=${playersChanged}, hosts=${hostsChanged}`)

    return NextResponse.json({ 
      success: true,
      stats: {
        duration: endTime - startTime,
        roomsBefore: roomsBefore.length,
        roomsAfter: roomsAfter.length,
        playersBefore: totalPlayersBefore,
        playersAfter: totalPlayersAfter,
        hostsBefore: totalHostsBefore,
        hostsAfter: totalHostsAfter
      }
    })
  } catch (error) {
    console.error("[CRON API] Error checking inactive players:", error)
    return NextResponse.json({ error: "Failed to check inactive players" }, { status: 500 })
  }
}
