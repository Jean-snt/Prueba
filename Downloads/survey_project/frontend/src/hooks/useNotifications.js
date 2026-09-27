import { useState, useEffect, useCallback } from 'react';
import { surveyAPI } from '../services/api';

export const useNotifications = (pollingInterval = 30000) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async (unreadOnly = false, limit = 20) => {
    try {
      setLoading(true);
      const response = await surveyAPI.getNotifications(unreadOnly, limit);
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Error al cargar notificaciones');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await surveyAPI.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await surveyAPI.markAllNotificationsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    // Cargar notificaciones iniciales
    fetchNotifications();

    // Configurar polling si se especifica un intervalo
    if (pollingInterval > 0) {
      const interval = setInterval(() => {
        fetchNotifications();
      }, pollingInterval);

      return () => clearInterval(interval);
    }
  }, [fetchNotifications, pollingInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
  };
};