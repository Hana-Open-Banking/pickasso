"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface ColorPaletteProps {
  currentColor: string
  onColorChange: (color: string) => void
  brushSize: number
  onBrushSizeChange: (size: number) => void
  disabled?: boolean
}

const colors = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#FFC0CB",
  "#A52A2A",
  "#808080",
  "#000080",
  "#008000",
  "#FF69B4",
  "#FFD700",
  "#40E0D0",
  "#EE82EE",
  "#90EE90",
]

export default function ColorPalette({
  currentColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  disabled,
}: ColorPaletteProps) {
  return (
    <div className="space-y-6">
      {/* 색상 팔레트 */}
      <div>
        <Label className="text-sm font-medium mb-3 block">색상</Label>
        <div className="grid grid-cols-5 gap-2">
          {colors.map((color) => (
            <Button
              key={color}
              variant="outline"
              className={`w-10 h-10 p-0 border-2 ${
                currentColor === color ? "border-gray-800 ring-2 ring-gray-400" : "border-gray-300"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => !disabled && onColorChange(color)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* 브러시 크기 */}
      <div>
        <Label className="text-sm font-medium mb-3 block">브러시 크기: {brushSize}px</Label>
        <Slider
          value={[brushSize]}
          onValueChange={(value) => !disabled && onBrushSizeChange(value[0])}
          min={1}
          max={20}
          step={1}
          disabled={disabled}
          className="w-full"
        />

        {/* 브러시 미리보기 */}
        <div className="mt-3 flex justify-center">
          <div
            className="rounded-full border border-gray-300"
            style={{
              width: Math.max(brushSize, 8),
              height: Math.max(brushSize, 8),
              backgroundColor: currentColor,
            }}
          />
        </div>
      </div>

      {/* 현재 선택된 색상 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">선택된 색상</Label>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg border-2 border-gray-300" style={{ backgroundColor: currentColor }} />
          <span className="text-sm font-mono text-gray-600">{currentColor.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}
