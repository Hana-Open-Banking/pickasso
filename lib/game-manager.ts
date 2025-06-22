import db, { type Room, type Player, type Drawing } from "./db"

const keywords = [
  "고양이",
  "강아지",
  "자동차",
  "집",
  "나무",
  "꽃",
  "태양",
  "달",
  "별",
  "바다",
  "산",
  "새",
  "물고기",
  "사과",
  "바나나",
  "케이크",
  "피자",
  "햄버거",
  "컴퓨터",
  "핸드폰",
]

export class GameManager {
  static createRoom(hostId: string): string {
    const roomId = Math.floor(100000 + Math.random() * 900000).toString()
    console.log(`Creating room with ID: ${roomId}, hostId: ${hostId}`)

    const stmt = db.prepare(`
      INSERT INTO rooms (id, host_id, status, time_left, round_number)
      VALUES (?, ?, 'waiting', 60, 1)
    `)
    stmt.run(roomId, hostId)

    console.log(`Room ${roomId} created successfully in database`)
    return roomId
  }

  static joinRoom(roomId: string, playerId: string, nickname: string): boolean {
    const room = this.getRoom(roomId)
    if (!room) {
      console.log(`Room ${roomId} not found`)
      return false
    }
    
    if (room.status !== "waiting") {
      console.log(`Room ${roomId} is not in waiting status. Current status: ${room.status}`)
      return false
    }

    // 닉네임 중복 체크
    const existingPlayer = db
      .prepare(`
      SELECT id FROM players WHERE room_id = ? AND nickname = ?
    `)
      .get(roomId, nickname)

    if (existingPlayer) {
      console.log(`Nickname "${nickname}" is already taken in room ${roomId}`)
      return false
    }

    const stmt = db.prepare(`
      INSERT INTO players (id, room_id, nickname, is_host, has_submitted, score)
      VALUES (?, ?, ?, FALSE, FALSE, 0)
    `)
    stmt.run(playerId, roomId, nickname)

    console.log(`Player ${playerId} (${nickname}) successfully joined room ${roomId}`)
    return true
  }

  static addHost(roomId: string, hostId: string, nickname: string): void {
    console.log(`Adding host to room: ${roomId}, hostId: ${hostId}, nickname: ${nickname}`)
    const stmt = db.prepare(`
      INSERT INTO players (id, room_id, nickname, is_host, has_submitted, score)
      VALUES (?, ?, ?, ?, FALSE, 0)
    `)
    stmt.run(hostId, roomId, nickname, true)
    console.log(`Host successfully added to room: ${roomId}`)
  }

  static getRoom(roomId: string): Room | null {
    console.log(`Getting room: ${roomId}`)
    const stmt = db.prepare("SELECT * FROM rooms WHERE id = ?")
    const room = stmt.get(roomId) as Room | null
    console.log(`Room ${roomId} found:`, room ? 'YES' : 'NO')
    if (room) {
      console.log(`Room details:`, room)
    }
    return room
  }

  static getRoomPlayers(roomId: string): Player[] {
    const stmt = db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY joined_at")
    return stmt.all(roomId) as Player[]
  }

  static startGame(roomId: string): string | null {
    const keyword = keywords[Math.floor(Math.random() * keywords.length)]

    const stmt = db.prepare(`
      UPDATE rooms 
      SET status = 'playing', current_keyword = ?, time_left = 60
      WHERE id = ?
    `)
    stmt.run(keyword, roomId)

    // 플레이어 제출 상태 초기화
    const resetStmt = db.prepare(`
      UPDATE players 
      SET has_submitted = FALSE 
      WHERE room_id = ?
    `)
    resetStmt.run(roomId)

    return keyword
  }

  static submitDrawing(playerId: string, roomId: string, canvasData: string): void {
    console.log(`Submitting drawing for player ${playerId} in room ${roomId}`)
    
    const room = this.getRoom(roomId)
    if (!room) {
      console.error(`Room ${roomId} not found for drawing submission`)
      return
    }

    // 그림 저장
    const drawingStmt = db.prepare(`
      INSERT INTO drawings (player_id, room_id, round_number, canvas_data, keyword)
      VALUES (?, ?, ?, ?, ?)
    `)
    drawingStmt.run(playerId, roomId, room.round_number, canvasData, room.current_keyword)
    console.log(`Drawing saved for player ${playerId}`)

    // 플레이어 제출 상태 업데이트
    const playerStmt = db.prepare(`
      UPDATE players 
      SET has_submitted = TRUE 
      WHERE id = ? AND room_id = ?
    `)
    playerStmt.run(playerId, roomId)
    console.log(`Player ${playerId} marked as submitted`)
  }

  static scoreDrawings(roomId: string): Record<string, number> {
    const room = this.getRoom(roomId)
    if (!room) return {}

    const drawings = db
      .prepare(`
      SELECT * FROM drawings 
      WHERE room_id = ? AND round_number = ?
    `)
      .all(roomId, room.round_number) as Drawing[]

    const scores: Record<string, number> = {}

    // Mock AI 채점 (실제로는 AI API 호출)
    drawings.forEach((drawing) => {
      const score = Math.floor(Math.random() * 100) + 1
      scores[drawing.player_id] = score

      // 점수 저장
      db.prepare(`
        UPDATE drawings 
        SET score = ? 
        WHERE id = ?
      `).run(score, drawing.id)

      // 플레이어 총점 업데이트
      db.prepare(`
        UPDATE players 
        SET score = score + ? 
        WHERE id = ?
      `).run(score, drawing.player_id)
    })

    // 방 상태 업데이트
    db.prepare(`
      UPDATE rooms 
      SET status = 'scoring' 
      WHERE id = ?
    `).run('scoring', roomId)

    return scores
  }

  static getWinner(roomId: string): string | null {
    const stmt = db.prepare(`
      SELECT id FROM players 
      WHERE room_id = ? 
      ORDER BY score DESC 
      LIMIT 1
    `)
    const winner = stmt.get(roomId) as { id: string } | null
    return winner?.id || null
  }

  static nextRound(roomId: string): string | null {
    const room = this.getRoom(roomId)
    if (!room) return null

    const keyword = keywords[Math.floor(Math.random() * keywords.length)]

    const stmt = db.prepare(`
      UPDATE rooms 
      SET status = 'playing', 
          current_keyword = ?, 
          time_left = 60, 
          round_number = round_number + 1
      WHERE id = ?
    `)
    stmt.run(keyword, roomId)

    // 플레이어 제출 상태 초기화
    const resetStmt = db.prepare(`
      UPDATE players 
      SET has_submitted = FALSE 
      WHERE room_id = ?
    `)
    resetStmt.run(roomId)

    return keyword
  }

  static deleteRoom(roomId: string): void {
    db.prepare("DELETE FROM drawings WHERE room_id = ?").run(roomId)
    db.prepare("DELETE FROM players WHERE room_id = ?").run(roomId)
    db.prepare("DELETE FROM rooms WHERE id = ?").run(roomId)
  }

  static addGameEvent(roomId: string, eventType: string, eventData?: any): void {
    const stmt = db.prepare(`
      INSERT INTO game_events (room_id, event_type, event_data)
      VALUES (?, ?, ?)
    `)
    stmt.run(roomId, eventType, eventData ? JSON.stringify(eventData) : null)
  }
}
