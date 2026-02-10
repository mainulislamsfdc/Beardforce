import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { notificationService } from '../services/notificationService'
import type { AppNotification, ToastNotification } from '../types'

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  toasts: ToastNotification[]
  addToast: (title: string, message: string, type: ToastNotification['type']) => void
  dismissToast: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  refresh: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(user.id, 20),
        notificationService.getUnreadCount(user.id),
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (err) {
      console.warn('Failed to fetch notifications:', err)
    }
  }, [user?.id])

  useEffect(() => {
    fetchNotifications()
    pollRef.current = setInterval(fetchNotifications, 30000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchNotifications])

  const addToast = useCallback((title: string, message: string, type: ToastNotification['type']) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, title, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.warn('Failed to mark as read:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return
    try {
      await notificationService.markAllAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.warn('Failed to mark all as read:', err)
    }
  }, [user?.id])

  const value = {
    notifications,
    unreadCount,
    toasts,
    addToast,
    dismissToast,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
