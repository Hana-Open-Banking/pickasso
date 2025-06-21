class MockSocket {
  private roomId = ""
  private nickname = ""
  private listeners: Record<string, Function[]> = {}

  connect(roomId: string, nickname: string) {
    this.roomId = roomId
    this.nickname = nickname
    console.log(`Connected to room ${roomId} as ${nickname}`)
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  emit(event: string, data: any) {
    console.log(`Emitting ${event}:`, data)
    // In a real implementation, this would send to server
  }

  disconnect() {
    this.roomId = ""
    this.nickname = ""
    this.listeners = {}
    console.log("Disconnected from socket")
  }

  private trigger(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data))
    }
  }
}

export const mockSocket = new MockSocket()
