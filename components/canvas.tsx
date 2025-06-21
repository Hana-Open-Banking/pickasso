"use client"

import { useRef, useEffect, useState, useCallback } from "react"

interface CanvasProps {
  color: string
  brushSize: number
  onCanvasChange: (dataUrl: string) => void
  disabled?: boolean
}

export default function Canvas({ color, brushSize, onCanvasChange, disabled }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  const getCanvasPoint = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    }
  }, [])

  const startDrawing = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (disabled) return

      e.preventDefault()
      const point = getCanvasPoint(e)
      if (point) {
        setIsDrawing(true)
        setLastPoint(point)
      }
    },
    [disabled, getCanvasPoint],
  )

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || disabled || !lastPoint) return

      e.preventDefault()
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      const currentPoint = getCanvasPoint(e)
      if (!currentPoint) return

      ctx.strokeStyle = color
      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      ctx.beginPath()
      ctx.moveTo(lastPoint.x, lastPoint.y)
      ctx.lineTo(currentPoint.x, currentPoint.y)
      ctx.stroke()

      setLastPoint(currentPoint)

      // 캔버스 데이터 업데이트
      const dataUrl = canvas.toDataURL()
      onCanvasChange(dataUrl)
    },
    [isDrawing, disabled, lastPoint, color, brushSize, getCanvasPoint, onCanvasChange],
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    setLastPoint(null)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 마우스 이벤트
    canvas.addEventListener("mousedown", startDrawing)
    canvas.addEventListener("mousemove", draw)
    canvas.addEventListener("mouseup", stopDrawing)
    canvas.addEventListener("mouseout", stopDrawing)

    // 터치 이벤트
    canvas.addEventListener("touchstart", startDrawing)
    canvas.addEventListener("touchmove", draw)
    canvas.addEventListener("touchend", stopDrawing)

    return () => {
      canvas.removeEventListener("mousedown", startDrawing)
      canvas.removeEventListener("mousemove", draw)
      canvas.removeEventListener("mouseup", stopDrawing)
      canvas.removeEventListener("mouseout", stopDrawing)
      canvas.removeEventListener("touchstart", startDrawing)
      canvas.removeEventListener("touchmove", draw)
      canvas.removeEventListener("touchend", stopDrawing)
    }
  }, [startDrawing, draw, stopDrawing])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      onCanvasChange("")
    }
  }

  useEffect(() => {
    // 초기 캔버스 설정
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) {
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  // 전역에서 clearCanvas 함수에 접근할 수 있도록
  useEffect(() => {
    if (canvasRef.current) {
      ;(canvasRef.current as any).clearCanvas = clearCanvas
    }
  }, [])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={`border-2 border-gray-300 rounded-lg bg-white w-full max-w-full h-auto ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-crosshair"
        }`}
        style={{ touchAction: "none" }}
      />
      {disabled && (
        <div className="absolute inset-0 bg-gray-500/20 rounded-lg flex items-center justify-center">
          <span className="bg-white px-4 py-2 rounded-lg shadow-lg font-medium">제출 완료</span>
        </div>
      )}
    </div>
  )
}
