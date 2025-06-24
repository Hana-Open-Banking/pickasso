import type { NextRequest } from "next/server"
import db, { type Drawing } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  const roomId = params.roomId

  try {
    const raw = db
      .prepare(`SELECT * FROM drawings WHERE room_id = ?`)
      .all(roomId) as unknown as { id: number; player_id: string; round_number: number; canvas_data: string }[]
    const drawings = raw.map(d => ({
      ...d,
      length: d.canvas_data?.length || 0
    }))

    return Response.json({ count: drawings.length, drawings })
  } catch (error: unknown) {
    console.error("Error fetching drawings:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
} 