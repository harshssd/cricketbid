'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#10B981', // Emerald
  '#1B2A4A', // Dark Blue
  '#7C2D12', // Dark Orange
  '#365314', // Dark Green
  '#0C4A6E', // Dark Cyan
]

interface ColorPickerProps {
  value?: string
  onChange?: (color: string) => void
  label?: string
  className?: string
  disabled?: boolean
  showPresets?: boolean
}

export function ColorPicker({
  value = '#3B82F6',
  onChange,
  label,
  className,
  disabled = false,
  showPresets = true
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [customColor, setCustomColor] = React.useState(value)

  React.useEffect(() => {
    setCustomColor(value)
  }, [value])

  const handleColorChange = (color: string) => {
    setCustomColor(color)
    onChange?.(color)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    onChange?.(color)
  }

  const isValidHex = (color: string) => {
    return /^#[0-9A-F]{6}$/i.test(color)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-start p-3 h-auto"
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: isValidHex(customColor) ? customColor : '#3B82F6' }}
              />
              <span className="text-sm font-mono">
                {isValidHex(customColor) ? customColor : '#3B82F6'}
              </span>
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Preset Colors */}
            {showPresets && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Preset Colors</Label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={cn(
                        "w-8 h-8 rounded border-2 transition-all hover:scale-110",
                        customColor === color
                          ? "border-gray-900 dark:border-white scale-110"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom Color Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Custom Color</Label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    placeholder="#3B82F6"
                    className="font-mono"
                  />
                  {!isValidHex(customColor) && (
                    <p className="text-xs text-red-500 mt-1">
                      Please enter a valid hex color (e.g., #3B82F6)
                    </p>
                  )}
                </div>
                <input
                  type="color"
                  value={isValidHex(customColor) ? customColor : '#3B82F6'}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Apply Button */}
            <Button
              onClick={() => setIsOpen(false)}
              className="w-full"
              disabled={!isValidHex(customColor)}
            >
              Apply Color
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Utility component for displaying color swatches
interface ColorSwatchProps {
  colors: string[]
  selectedColor?: string
  onColorSelect?: (color: string) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ColorSwatch({
  colors,
  selectedColor,
  onColorSelect,
  size = 'md',
  className
}: ColorSwatchProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onColorSelect?.(color)}
          className={cn(
            sizeClasses[size],
            "rounded border-2 transition-all hover:scale-110",
            selectedColor === color
              ? "border-gray-900 dark:border-white scale-110"
              : "border-gray-300 hover:border-gray-400"
          )}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  )
}