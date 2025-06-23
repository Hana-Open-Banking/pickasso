// 메모리 기반 데이터베이스 구현
export interface Room {
  id: string
  host_id: string
  created_at: string
  status: "waiting" | "playing" | "scoring" | "finished"
  current_keyword?: string
  time_left: number
  round_number: number
}

export interface Player {
  id: string
  room_id: string
  nickname: string
  is_host: boolean
  has_submitted: boolean
  score: number
  joined_at: string
}

export interface Drawing {
  id: number
  player_id: string
  room_id: string
  round_number: number
  canvas_data: string
  keyword: string
  score?: number
  submitted_at: string
}

export interface GameEvent {
  id: number
  room_id: string
  event_type: string
  event_data?: string
  created_at: string
}

// 메모리 저장소 - 전역 변수로 관리
declare global {
  var __rooms: Map<string, Room> | undefined
  var __players: Map<string, Player> | undefined
  var __drawings: Map<number, Drawing> | undefined
  var __gameEvents: Map<number, GameEvent> | undefined
  var __drawingIdCounter: number | undefined
  var __eventIdCounter: number | undefined
}

// 전역 변수 초기화
const rooms = globalThis.__rooms || new Map<string, Room>()
const players = globalThis.__players || new Map<string, Player>()
const drawings = globalThis.__drawings || new Map<number, Drawing>()
const gameEvents = globalThis.__gameEvents || new Map<number, GameEvent>()
let drawingIdCounter = globalThis.__drawingIdCounter || 1
let eventIdCounter = globalThis.__eventIdCounter || 1

// 전역 변수에 할당
globalThis.__rooms = rooms
globalThis.__players = players
globalThis.__drawings = drawings
globalThis.__gameEvents = gameEvents
globalThis.__drawingIdCounter = drawingIdCounter
globalThis.__eventIdCounter = eventIdCounter

// 데이터베이스 인터페이스
class MemoryDatabase {
  prepare(query: string) {
    return {
      run: (...params: any[]) => {
        console.log("\n[DB] Executing query:", query)
        console.log("[DB] Query parameters:", params)

        if (query.includes('INSERT INTO rooms')) {
          const [roomId, hostId] = params
          console.log(`[DB] Creating room ${roomId} with host ${hostId}`)
          rooms.set(roomId, {
            id: roomId,
            host_id: hostId,
            created_at: new Date().toISOString(),
            status: 'waiting',
            time_left: 60,
            round_number: 1
          })
          console.log(`[DB] Room created:`, rooms.get(roomId))
          return { changes: 1 }
        } else if (query.includes('INSERT INTO players')) {
          const [playerId, roomId, nickname, isHost] = params
          console.log(`[DB] Adding player ${playerId} (${nickname}) to room ${roomId}, isHost: ${isHost}`)
          players.set(playerId, {
            id: playerId,
            room_id: roomId,
            nickname,
            is_host: isHost,
            has_submitted: false,
            score: 0,
            joined_at: new Date().toISOString()
          })
          console.log(`[DB] Player added successfully:`, players.get(playerId))
          return { changes: 1 }
        } else if (query.includes('INSERT INTO drawings')) {
          const playerId = params[0]
          const roomId = params[1]
          const roundNumber = params[2]
          const canvasData = params[3]
          const keyword = params[4]
          drawings.set(drawingIdCounter, {
            id: drawingIdCounter,
            player_id: playerId,
            room_id: roomId,
            round_number: roundNumber,
            canvas_data: canvasData,
            keyword,
            submitted_at: new Date().toISOString()
          })
          drawingIdCounter++
        } else if (query.includes('INSERT INTO game_events')) {
          const roomId = params[0]
          const eventType = params[1]
          const eventData = params[2]
          gameEvents.set(eventIdCounter, {
            id: eventIdCounter,
            room_id: roomId,
            event_type: eventType,
            event_data: eventData,
            created_at: new Date().toISOString()
          })
          eventIdCounter++
        } else if (query.includes('UPDATE rooms')) {
          const roomId = params[params.length - 1]
          const room = rooms.get(roomId)
          if (room) {
            console.log(`DB: Updating room ${roomId} with params:`, params)
            if (query.includes('status =') && query.includes('current_keyword =') && query.includes('round_number =')) {
              // nextRound에서 사용하는 쿼리
              // 쿼리: SET status = 'playing', current_keyword = ?, time_left = 60, round_number = round_number + 1 WHERE id = ?
              // 파라미터: [keyword, roomId]
              room.status = 'playing'
              room.current_keyword = params[0]
              room.time_left = 60
              room.round_number += 1
            } else if (query.includes('status =') && query.includes('current_keyword =')) {
              // startGame에서 사용하는 쿼리
              // 쿼리: SET status = 'playing', current_keyword = ?, time_left = 60 WHERE id = ?
              // 파라미터: [keyword, roomId]
              room.status = 'playing'  // 하드코딩된 값
              room.current_keyword = params[0]  // keyword
              room.time_left = 60  // 하드코딩된 값
            } else if (query.includes('status =') && query.includes('scoring')) {
              // scoring 상태로 변경
              room.status = 'scoring'
            } else if (query.includes('host_id =')) {
              // 방장 ID 업데이트 (transferHost에서 사용)
              const newHostId = params[0]
              console.log(`DB: Updating room ${roomId} host_id to: ${newHostId}`)
              room.host_id = newHostId
            } else if (query.includes('status =')) {
              // 단순 status 업데이트
              const status = params[0]
              console.log(`DB: Setting room status to: ${status}`)
              room.status = status
            } else if (query.includes('current_keyword =')) {
              room.current_keyword = params[0]
              room.time_left = params[1]
            } else if (query.includes('time_left =')) {
              room.time_left = params[0]
            } else if (query.includes('round_number =')) {
              room.round_number = params[0]
            }
            console.log(`DB: Room ${roomId} updated:`, room)
          }
        } else if (query.includes('UPDATE players') && query.includes('WHERE room_id =')) {
          // 플레이어 제출 상태 초기화 (room_id로 업데이트)
          const roomId = params[0]
          const hasSubmitted = params[1]
          console.log(`DB: Resetting all players in room ${roomId} has_submitted to: ${hasSubmitted}`)
          
          for (const player of players.values()) {
            if (player.room_id === roomId) {
              player.has_submitted = hasSubmitted
              console.log(`DB: Updated player ${player.id} has_submitted to ${hasSubmitted}`)
            }
          }
        } else if (query.includes('UPDATE players')) {
          const playerId = params[0]
          const player = players.get(playerId)
          if (player) {
            if (query.includes('has_submitted =')) {
              const hasSubmitted = params[1]
              console.log(`DB: Updating player ${playerId} has_submitted: ${hasSubmitted}`)
              player.has_submitted = hasSubmitted
            }
            if (query.includes('score = score +')) {
              player.score += params[0]
            }
            if (query.includes('is_host = TRUE')) {
              player.is_host = true
              console.log(`DB: Player ${playerId} became host`)
            }
            if (query.includes('is_host = FALSE')) {
              player.is_host = false
              console.log(`DB: Player ${playerId} is no longer host`)
            }
          }
        } else if (query.includes('UPDATE players') && query.includes('WHERE room_id =') && query.includes('is_host = FALSE')) {
          // 모든 플레이어의 방장 권한 해제
          const roomId = params[0]
          console.log(`[DB] Removing host status from all players in room ${roomId}`)
          console.log(`[DB] Players before update:`, Array.from(players.values()))
          let updateCount = 0
          for (const player of players.values()) {
            if (player.room_id === roomId) {
              player.is_host = false
              updateCount++
            }
          }
          console.log(`[DB] Players after update:`, Array.from(players.values()))
          return { changes: updateCount }
        } else if (query.includes('UPDATE players') && query.includes('SET is_host = TRUE')) {
          // 새로운 방장 설정
          const [playerId, roomId] = params
          console.log(`[DB] Setting player ${playerId} as new host in room ${roomId}`)
          console.log(`[DB] Players before update:`, Array.from(players.values()))
          const player = Array.from(players.values()).find(p => p.id === playerId && p.room_id === roomId)
          if (player) {
            player.is_host = true
            console.log(`[DB] Successfully set player ${playerId} as new host`)
            console.log(`[DB] Players after update:`, Array.from(players.values()))
            return { changes: 1 }
          } else {
            console.error(`[DB] Failed to find player ${playerId} in room ${roomId}`)
            return { changes: 0 }
          }
        } else if (query.includes('UPDATE drawings')) {
          const score = params[0]
          const drawingId = params[1]
          const drawing = drawings.get(drawingId)
          if (drawing) {
            drawing.score = score
          }
        } else if (query.includes('DELETE FROM players') && query.includes('WHERE id = ?') && query.includes('AND room_id = ?')) {
          const [playerId, roomId] = params
          console.log(`[DB] DELETE 로직 진입! player: ${playerId}, room: ${roomId}`)
          
          const player = players.get(playerId)
          console.log(`[DB] Found player:`, player)
          
          if (player && player.room_id === roomId) {
            const deleteResult = players.delete(playerId)
            console.log(`[DB] Delete result:`, deleteResult)
            return { changes: 1 }
          }
          
          return { changes: 0 }
        } else if (query.includes('DELETE FROM rooms WHERE id =')) {
          const roomId = params[0]
          console.log(`[DB] Deleting room ${roomId}`)
          const roomDeleted = rooms.delete(roomId)
          console.log(`[DB] Room deletion successful:`, roomDeleted)
          
          // 방이 삭제될 때 해당 방의 모든 플레이어도 삭제
          let playerCount = 0
          const playersToDelete = Array.from(players.values()).filter(p => p.room_id === roomId)
          
          for (const player of playersToDelete) {
            console.log(`[DB] Removing player ${player.id} as part of room ${roomId} deletion`)
            players.delete(player.id)
            playerCount++
          }
          
          console.log(`[DB] Room ${roomId} and ${playerCount} players deleted`)
          return { changes: roomDeleted ? 1 : 0 }
        } else if (query.includes('UPDATE players') && query.includes('has_submitted')) {
          const [roomId] = params
          console.log(`DB: Resetting all players in room ${roomId} has_submitted to: undefined`)
          for (const [playerId, player] of players.entries()) {
            if (player.room_id === roomId) {
              player.has_submitted = false
              console.log(`DB: Updated player ${playerId} has_submitted to undefined`)
            }
          }
        }
        return { changes: 0 }
      },
      get: (...params: any[]) => {
        console.log("\n[DB] Executing query:", query)
        console.log("[DB] Query parameters:", params)
        console.log("[DB] Current players in memory:", Array.from(players.values()))

        if (query.includes('SELECT * FROM players')) {
          const [playerId, roomId] = params
          console.log(`[DB] Looking for player ${playerId} in room ${roomId}`)
          const player = players.get(playerId)
          console.log(`[DB] Found player in memory:`, player)
          const isValidPlayer = player && player.room_id === roomId
          console.log(`[DB] Is player valid for room ${roomId}?`, isValidPlayer)
          return isValidPlayer ? player : null
        } else if (query.includes('SELECT * FROM rooms WHERE id =')) {
          const roomId = params[0]
          console.log(`[DB] Looking for room ${roomId}`)
          console.log(`[DB] Available rooms:`, Array.from(rooms.keys()))
          const room = rooms.get(roomId) || null
          console.log(`[DB] Room ${roomId} found:`, room ? 'YES' : 'NO')
          if (room) {
            console.log(`[DB] Room details:`, room)
          }
          return room
        } else if (query.includes('SELECT id, nickname FROM players WHERE room_id = ? AND is_host = TRUE')) {
          const roomId = params[0]
          console.log(`[DB] Looking for host in room ${roomId}`)
          const player = Array.from(players.values()).find(p => p.room_id === roomId && p.is_host === true)
          console.log(`[DB] Host found:`, player || 'No host found')
          return player ? { id: player.id, nickname: player.nickname } : null
        } else if (query.includes('SELECT id, nickname FROM players WHERE id = ? AND room_id = ?')) {
          const [playerId, roomId] = params
          console.log(`[DB] Looking for player ${playerId} in room ${roomId}`)
          const player = players.get(playerId)
          console.log(`[DB] Player found:`, player || 'No player found')
          return player && player.room_id === roomId ? { id: player.id, nickname: player.nickname } : null
        }
        return null
      },
      all: (...params: any[]) => {
        console.log("\n[DB] Executing query:", query)
        console.log("[DB] Query parameters:", params)

        if (query.includes('SELECT * FROM players WHERE room_id =')) {
          const roomId = params[0]
          console.log(`[DB] Getting players for room ${roomId}`)
          const roomPlayers = Array.from(players.values())
            .filter(p => p.room_id === roomId)
            .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
          console.log(`[DB] Found ${roomPlayers.length} players:`, roomPlayers.map(p => ({
            id: p.id,
            nickname: p.nickname,
            is_host: p.is_host,
            joined_at: p.joined_at
          })))
          return roomPlayers
        } else if (query.includes('SELECT * FROM drawings WHERE room_id =') && query.includes('round_number =')) {
          const roomId = params[0]
          const roundNumber = params[1]
          return Array.from(drawings.values()).filter(d => 
            d.room_id === roomId && d.round_number === roundNumber
          )
        } else if (query.includes('SELECT * FROM game_events WHERE room_id =')) {
          const roomId = params[0]
          return Array.from(gameEvents.values()).filter(e => e.room_id === roomId)
        }
        return []
      }
    }
  }

  exec(query: string) {
    // 테이블 생성 쿼리는 무시 (메모리에서는 필요 없음)
  }
}

const db = new MemoryDatabase()

export default db
