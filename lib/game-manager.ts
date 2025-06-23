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
      VALUES (?, ?, ?, ?, FALSE, 0)
    `)
    stmt.run(playerId, roomId, nickname, false)

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
    console.log(`Starting scoring for room ${roomId}`)
    const room = this.getRoom(roomId)
    if (!room) {
      console.error(`Room ${roomId} not found for scoring`)
      return {}
    }

    const drawings = db
      .prepare(`
      SELECT * FROM drawings 
      WHERE room_id = ? AND round_number = ?
    `)
      .all(roomId, room.round_number) as Drawing[]

    console.log(`Found ${drawings.length} drawings to score`)

    const scores: Record<string, number> = {}

    // Mock AI 채점 (실제로는 AI API 호출)
    drawings.forEach((drawing) => {
      const score = Math.floor(Math.random() * 100) + 1
      scores[drawing.player_id] = score
      console.log(`Player ${drawing.player_id} scored: ${score}`)

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

    // 방 상태를 'scoring'에서 'finished'로 변경
    db.prepare(`
      UPDATE rooms 
      SET status = 'finished' 
      WHERE id = ?
    `).run('finished', roomId)
    
    console.log(`Room ${roomId} status updated to 'finished'`)
    console.log(`Final scores:`, scores)

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
    console.log(`Starting next round for room ${roomId}`)
    const room = this.getRoom(roomId)
    if (!room) {
      console.error(`Room ${roomId} not found for next round`)
      return null
    }

    const keyword = keywords[Math.floor(Math.random() * keywords.length)]
    console.log(`Next round keyword: ${keyword}`)

    const stmt = db.prepare(`
      UPDATE rooms 
      SET status = 'playing', 
          current_keyword = ?, 
          time_left = 60, 
          round_number = round_number + 1
      WHERE id = ?
    `)
    stmt.run(keyword, roomId)
    console.log(`Room ${roomId} updated for next round`)

    // 플레이어 제출 상태 초기화
    const resetStmt = db.prepare(`
      UPDATE players 
      SET has_submitted = FALSE 
      WHERE room_id = ?
    `)
    resetStmt.run(roomId)
    console.log(`All players in room ${roomId} reset for next round`)

    // 게임 이벤트 추가
    this.addGameEvent(roomId, "next_round_started", { keyword, roundNumber: room.round_number + 1 })

    return keyword
  }

  static deleteRoom(roomId: string): void {
    db.prepare("DELETE FROM drawings WHERE room_id = ?").run(roomId)
    db.prepare("DELETE FROM players WHERE room_id = ?").run(roomId)
    db.prepare("DELETE FROM rooms WHERE id = ?").run(roomId)
  }

  static removePlayer(roomId: string, playerId: string): boolean {
    console.log(`[GameManager] Removing player ${playerId} from room ${roomId}`)
    
    // 플레이어가 실제로 방에 있는지 확인
    const player = db.prepare(`
      SELECT * FROM players 
      WHERE id = ? AND room_id = ?
    `).get(playerId, roomId)

    if (!player) {
      console.log(`[GameManager] Player ${playerId} not found in room ${roomId}`)
      return false
    }

    console.log(`[GameManager] Found player to remove:`, player)

    try {
      // 플레이어 삭제
      const result = db.prepare(`
        DELETE FROM players 
        WHERE id = ? AND room_id = ?
      `).run(playerId, roomId)

      console.log(`[GameManager] Player removal result:`, result)

      if (!result || result.changes === 0) {
        console.log(`[GameManager] Failed to remove player - no changes made`)
        return false
      }

      // 방에 남은 플레이어 확인
      const remainingPlayers = this.getRoomPlayers(roomId)
      console.log(`[GameManager] Remaining players in room:`, remainingPlayers)

      if (remainingPlayers.length === 0) {
        console.log(`[GameManager] No players left in room ${roomId}, deleting room`)
        this.deleteRoom(roomId)
      }

      return true
    } catch (error) {
      console.error(`[GameManager] Failed to remove player:`, error)
      return false
    }
  }

  static transferHost(roomId: string, newHostId: string): void {
    console.log(`[GameManager] Transferring host to player ${newHostId} in room ${roomId}`)
    
    // 현재 방장 정보 확인
    const currentHost = db.prepare(`
      SELECT id, nickname FROM players 
      WHERE room_id = ? AND is_host = TRUE
    `).get(roomId) as { id: string, nickname: string } | null
    
    if (currentHost) {
      console.log(`[GameManager] Current host: ${currentHost.id} (${currentHost.nickname})`)
    }
    
    // 새로운 방장 정보 확인
    const newHost = db.prepare(`
      SELECT id, nickname FROM players 
      WHERE id = ? AND room_id = ?
    `).get(newHostId, roomId) as { id: string, nickname: string } | null
    
    if (!newHost) {
      console.error(`[GameManager] New host ${newHostId} not found in room ${roomId}`)
      throw new Error(`New host ${newHostId} not found in room ${roomId}`)
    }
    
    console.log(`[GameManager] New host candidate: ${newHost.id} (${newHost.nickname})`)
    
    try {
      // 먼저 새로운 방장 설정
      const updateNewHost = db.prepare(`
        UPDATE players 
        SET is_host = TRUE 
        WHERE id = ? AND room_id = ?
      `)
      const newHostResult = updateNewHost.run(newHostId, roomId)
      console.log(`[GameManager] New host update result:`, newHostResult)
      
      // 그 다음 기존 방장을 일반 플레이어로 변경
      const updateOldHost = db.prepare(`
        UPDATE players 
        SET is_host = FALSE 
        WHERE room_id = ? AND is_host = TRUE AND id != ?
      `)
      const oldHostResult = updateOldHost.run(roomId, newHostId)
      console.log(`[GameManager] Old host update result:`, oldHostResult)
      
      // 방의 host_id 업데이트
      const updateRoom = db.prepare(`
        UPDATE rooms 
        SET host_id = ? 
        WHERE id = ?
      `)
      const roomResult = updateRoom.run(newHostId, roomId)
      console.log(`[GameManager] Room update result:`, roomResult)
      
      // 변경 사항 확인
      const verifyHost = db.prepare(`
        SELECT id, nickname, is_host FROM players 
        WHERE room_id = ? AND is_host = TRUE
      `).get(roomId) as { id: string, nickname: string, is_host: boolean } | null
      
      console.log(`[GameManager] Verification - Current host:`, verifyHost)
      
      const verifyRoom = db.prepare(`
        SELECT host_id FROM rooms WHERE id = ?
      `).get(roomId) as { host_id: string } | null
      
      console.log(`[GameManager] Verification - Room host_id:`, verifyRoom)
      
      if (!verifyHost || verifyHost.id !== newHostId) {
        throw new Error(`Host transfer verification failed. Expected host: ${newHostId}, Actual host: ${verifyHost?.id}`)
      }
      
      console.log(`[GameManager] Host successfully transferred from ${currentHost?.id} to ${newHostId}`)
    } catch (error) {
      console.error(`[GameManager] Error transferring host:`, error)
      throw error
    }
  }

  static findNewHost(roomId: string, excludePlayerId?: string): string | null {
    const players = this.getRoomPlayers(roomId)
    console.log(`findNewHost: All players in room ${roomId}:`, players.map(p => ({ id: p.id, nickname: p.nickname, is_host: p.is_host, joined_at: p.joined_at })))
    
    if (players.length === 0) {
      console.log(`findNewHost: No players in room ${roomId}`)
      return null
    }
    
    // 나가려는 플레이어를 제외한 플레이어들 중에서 선택
    const availablePlayers = excludePlayerId 
      ? players.filter(p => p.id !== excludePlayerId)
      : players
    
    console.log(`findNewHost: Excluding player ${excludePlayerId}, available players:`, availablePlayers.map(p => ({ id: p.id, nickname: p.nickname, is_host: p.is_host, joined_at: p.joined_at })))
    
    if (availablePlayers.length === 0) {
      console.log(`findNewHost: No available players after exclusion`)
      return null
    }
    
    // 가장 먼저 입장한 플레이어를 새로운 방장으로 선택
    // joined_at으로 정렬하여 가장 먼저 들어온 플레이어 선택
    const sortedPlayers = availablePlayers.sort((a, b) => {
      const aTime = new Date(a.joined_at).getTime()
      const bTime = new Date(b.joined_at).getTime()
      return aTime - bTime
    })
    
    const newHost = sortedPlayers[0]
    console.log(`findNewHost: New host selected: ${newHost.id} (${newHost.nickname}) - joined at ${newHost.joined_at}`)
    return newHost.id
  }

  static addGameEvent(roomId: string, eventType: string, eventData?: any): void {
    const stmt = db.prepare(`
      INSERT INTO game_events (room_id, event_type, event_data)
      VALUES (?, ?, ?)
    `)
    stmt.run(roomId, eventType, eventData ? JSON.stringify(eventData) : null)
  }
}
