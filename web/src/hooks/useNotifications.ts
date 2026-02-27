'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NotificationType } from '@/lib/types'

interface NotificationData {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body?: string | null
  data?: Record<string, unknown> | null
  read_at?: string | null
  created_at: string
}

interface UseNotificationsReturn {
  notifications: NotificationData[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
}

const POLL_INTERVAL = 60_000 // 1 minute

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) return

      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    const interval = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
      })

      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }, [])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllRead,
    refresh: fetchNotifications,
  }
}
