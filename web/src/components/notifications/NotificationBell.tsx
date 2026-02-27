'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Calendar, Users, Trophy, Mail, Check } from 'lucide-react'
import type { NotificationType } from '@/lib/types'

const notificationIcons: Record<NotificationType, typeof Bell> = {
  EVENT_REMINDER: Calendar,
  EVENT_CREATED: Calendar,
  MEMBER_JOINED: Users,
  TOURNAMENT_REGISTRATION: Trophy,
  TOURNAMENT_UPDATE: Trophy,
  CLUB_INVITE: Mail,
  GENERAL: Bell,
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    setIsOpen(!isOpen)
  }

  const handleNotificationClick = (notificationId: string, readAt: string | null | undefined) => {
    if (!readAt) {
      markAsRead([notificationId])
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={handleOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-blue-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/[0.08] bg-[#0f1420] shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
                onClick={markAllRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell
                const isUnread = !notification.read_at
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id, notification.read_at)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-b-0 ${
                      isUnread ? 'bg-blue-500/[0.03]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 mt-0.5 ${isUnread ? 'text-blue-400' : 'text-muted-foreground'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {isUnread && (
                        <div className="shrink-0 mt-1.5">
                          <div className="h-2 w-2 rounded-full bg-blue-400" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
