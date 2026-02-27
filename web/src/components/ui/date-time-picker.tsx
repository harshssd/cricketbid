'use client'

import * as React from 'react'
import { Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date and time',
  disabled = false,
  className,
  minDate
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(value, 'HH:mm') : '18:00'
  )

  React.useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setTimeValue(format(value, 'HH:mm'))
    }
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours, minutes, 0, 0)
      setSelectedDate(newDate)
      onChange?.(newDate)
    } else {
      setSelectedDate(undefined)
      onChange?.(undefined)
    }
  }

  const handleTimeChange = (time: string) => {
    setTimeValue(time)
    if (selectedDate) {
      const [hours, minutes] = time.split(':').map(Number)
      const newDate = new Date(selectedDate)
      newDate.setHours(hours, minutes, 0, 0)
      setSelectedDate(newDate)
      onChange?.(newDate)
    }
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value
    if (dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number)
      const [hours, minutes] = timeValue.split(':').map(Number)
      const newDate = new Date(year, month - 1, day, hours, minutes)

      // Only block dates that are entirely before the min date (date-level check)
      if (minDate) {
        const minDateStart = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
        const selectedDateStart = new Date(year, month - 1, day)
        if (selectedDateStart < minDateStart) {
          return
        }
      }

      setSelectedDate(newDate)
      onChange?.(newDate)
    }
  }

  const today = new Date()
  // Use only the date portion for the min attribute so today is always selectable
  const minDateOnly = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : today
  const minDateStr = format(minDateOnly, 'yyyy-MM-dd')
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-3">
        {/* Date Input */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Date</Label>
          <div className="relative">
            <Input
              type="date"
              value={selectedDateStr}
              onChange={handleDateInputChange}
              min={minDateStr}
              disabled={disabled}
              className="pr-8"
            />
            <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Time Input */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Time</Label>
          <div className="relative">
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              disabled={disabled}
              className="pr-8"
            />
            <Clock className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Selected DateTime Display */}
      {selectedDate && (
        <div className="text-sm text-muted-foreground bg-muted rounded-md p-2">
          <span className="font-medium">Selected:</span> {format(selectedDate, 'EEEE, MMMM do, yyyy \'at\' h:mm a')}
        </div>
      )}
    </div>
  )
}

// Quick preset buttons for common times
interface TimePresetsProps {
  onTimeSelect: (date: Date) => void
  className?: string
}

export function TimePresets({ onTimeSelect, className }: TimePresetsProps) {
  const presets = [
    { label: 'Tomorrow 6 PM', getDate: () => {
      const date = new Date()
      date.setDate(date.getDate() + 1)
      date.setHours(18, 0, 0, 0)
      return date
    }},
    { label: 'This Weekend', getDate: () => {
      const date = new Date()
      const saturday = new Date(date)
      saturday.setDate(date.getDate() + (6 - date.getDay()))
      saturday.setHours(14, 0, 0, 0)
      return saturday
    }},
    { label: 'Next Week', getDate: () => {
      const date = new Date()
      date.setDate(date.getDate() + 7)
      date.setHours(19, 0, 0, 0)
      return date
    }}
  ]

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-xs font-medium text-muted-foreground">Quick Select</Label>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => onTimeSelect(preset.getDate())}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  )
}