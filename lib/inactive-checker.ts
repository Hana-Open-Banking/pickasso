import { GameManager } from "./game-manager"

// Only run in server environment
if (typeof window === 'undefined') {
  console.log("[INACTIVE CHECKER] Setting up inactive player checker...")

  // Check for inactive players every 15 seconds
  const intervalId = setInterval(() => {
    try {
      console.log("[INACTIVE CHECKER] Running scheduled inactive player check...")
      const startTime = Date.now()
      GameManager.checkInactivePlayers()
      const endTime = Date.now()
      console.log(`[INACTIVE CHECKER] Inactive player check completed in ${endTime - startTime}ms`)
    } catch (error) {
      console.error("[INACTIVE CHECKER] Error checking inactive players:", error)
    }
  }, 15000) // 15 seconds

  console.log(`[INACTIVE CHECKER] Inactive player checker interval ID: ${intervalId}`)
}

export {}
