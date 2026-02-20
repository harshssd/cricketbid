'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Cloud, CloudOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutoSaveIndicatorProps {
  lastSaved?: string
  className?: string
}

export function AutoSaveIndicator({ lastSaved, className }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (lastSaved) {
      setShowSaved(true)
      const timer = setTimeout(() => {
        setShowSaved(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSaved])

  const formatTime = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)

      if (diffInMinutes < 1) return 'just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return null
    }
  }

  const timeText = formatTime(lastSaved)

  if (!timeText) {
    return (
      <div className={cn("flex items-center space-x-2 text-xs text-gray-500", className)}>
        <CloudOff className="h-3 w-3" />
        <span>Not saved</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center space-x-2 text-xs transition-colors duration-200",
      showSaved ? "text-green-600" : "text-gray-500",
      className
    )}>
      {showSaved ? (
        <>
          <CheckCircle className="h-3 w-3" />
          <span>Saved</span>
        </>
      ) : (
        <>
          <Cloud className="h-3 w-3" />
          <span>Auto-saved {timeText}</span>
        </>
      )}
    </div>
  )
}