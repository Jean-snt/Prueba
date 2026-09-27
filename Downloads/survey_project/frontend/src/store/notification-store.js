import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { surveyAPI } from '../services/api';

// Notification Store - Manejo de estado para notificaciones
const useNotificationStore = create()(
  devtools(
    persist(
      (set, get) => ({
        // Estado inicial
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
        
        // Configuración
        settings: {
          autoRefresh: true,
          refreshInterval: 30000, // 30 segundos
          maxNotifications: 50,
          showToasts: true,
        },

        // Filtros
        filters: {
          unreadOnly: false,
          type: null, // 'survey', 'comment', 'report', etc.
          dateRange: null,
        },

        // Actions - Cargar notificaciones
        fetchNotifications: async (options = {}) => {
          const { unreadOnly = false, limit = 20 } = options;
          set({ loading: true, error: null });
          
          try {
            const response = await surveyAPI.getNotifications(unreadOnly, limit);
            const notifications = response.data.notifications || [];
            const unreadCount = response.data.unread_count || 0;
            
            // Procesar notificaciones para agregar metadata
            const processedNotifications = notifications.map(notification => ({
              ...notification,
              timestamp: new Date(notification.created_at),
              timeAgo: getTimeAgo(notification.created_at),
              type: detectNotificationType(notification.message),
              priority: detectPriority(notification.message),
            }));
            
            set({
              notifications: processedNotifications,
              unreadCount,
              loading: false,
            });
            
            return processedNotifications;
            
          } catch (error) {
            set({ 
              error: 'Error al cargar las notificaciones',
              loading: false 
            });
          }
        },

        // Marcar notificación como leída
        markAsRead: async (notificationId) => {
          try {
            await surveyAPI.markNotificationRead(notificationId);
            
            const { notifications, unreadCount } = get();
            const updatedNotifications = notifications.map(notification =>
              notification.id === notificationId
                ? { ...notification, is_read: true }
                : notification
            );
            
            const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read);
            const newUnreadCount = wasUnread ? Math.max(0, unreadCount - 1) : unreadCount;
            
            set({
              notifications: updatedNotifications,
              unreadCount: newUnreadCount,
            });
            
          } catch (error) {
            set({ error: 'Error al marcar como leída' });
          }
        },

        // Marcar todas como leídas
        markAllAsRead: async () => {
          try {
            await surveyAPI.markAllNotificationsRead();
            
            const { notifications } = get();
            const updatedNotifications = notifications.map(notification => ({
              ...notification,
              is_read: true,
            }));
            
            set({
              notifications: updatedNotifications,
              unreadCount: 0,
            });
            
          } catch (error) {
            set({ error: 'Error al marcar todas como leídas' });
          }
        },

        // Agregar notificación local (para notificaciones en tiempo real)
        addNotification: (notification) => {
          const { notifications, settings } = get();
          
          const processedNotification = {
            ...notification,
            id: notification.id || Date.now(),
            timestamp: new Date(),
            timeAgo: 'Ahora',
            type: detectNotificationType(notification.message),
            priority: detectPriority(notification.message),
            is_read: false,
          };
          
          const updatedNotifications = [
            processedNotification,
            ...notifications.slice(0, settings.maxNotifications - 1)
          ];
          
          set({
            notifications: updatedNotifications,
            unreadCount: get().unreadCount + 1,
          });
          
          // Mostrar toast si está habilitado
          if (settings.showToasts) {
            showToastNotification(processedNotification);
          }
        },

        // Eliminar notificación
        removeNotification: (notificationId) => {
          const { notifications, unreadCount } = get();
          const notification = notifications.find(n => n.id === notificationId);
          const wasUnread = notification && !notification.is_read;
          
          set({
            notifications: notifications.filter(n => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
          });
        },

        // Limpiar todas las notificaciones
        clearAll: () => {
          set({
            notifications: [],
            unreadCount: 0,
          });
        },

        // Actualizar filtros
        updateFilters: (newFilters) => {
          set(state => ({
            filters: { ...state.filters, ...newFilters }
          }));
        },

        // Obtener notificaciones filtradas
        getFilteredNotifications: () => {
          const { notifications, filters } = get();
          let filtered = [...notifications];
          
          if (filters.unreadOnly) {
            filtered = filtered.filter(n => !n.is_read);
          }
          
          if (filters.type) {
            filtered = filtered.filter(n => n.type === filters.type);
          }
          
          if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            filtered = filtered.filter(n => {
              const date = new Date(n.created_at);
              return date >= start && date <= end;
            });
          }
          
          return filtered;
        },

        // Obtener estadísticas
        getStats: () => {
          const { notifications } = get();
          
          const stats = {
            total: notifications.length,
            unread: notifications.filter(n => !n.is_read).length,
            today: notifications.filter(n => isToday(n.created_at)).length,
            thisWeek: notifications.filter(n => isThisWeek(n.created_at)).length,
          };
          
          // Estadísticas por tipo
          const typeStats = notifications.reduce((acc, notification) => {
            const type = notification.type || 'other';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});
          
          return { ...stats, byType: typeStats };
        },

        // Configurar auto-refresh
        startAutoRefresh: () => {
          const { settings } = get();
          
          if (settings.autoRefresh && !get().refreshInterval) {
            const interval = setInterval(() => {
              get().fetchNotifications({ unreadOnly: false, limit: 20 });
            }, settings.refreshInterval);
            
            set({ refreshInterval: interval });
          }
        },

        // Detener auto-refresh
        stopAutoRefresh: () => {
          const { refreshInterval } = get();
          
          if (refreshInterval) {
            clearInterval(refreshInterval);
            set({ refreshInterval: null });
          }
        },

        // Actualizar configuración
        updateSettings: (newSettings) => {
          const { settings } = get();
          const updatedSettings = { ...settings, ...newSettings };
          
          set({ settings: updatedSettings });
          
          // Reiniciar auto-refresh si cambió la configuración
          if (newSettings.autoRefresh !== undefined || newSettings.refreshInterval !== undefined) {
            get().stopAutoRefresh();
            if (updatedSettings.autoRefresh) {
              get().startAutoRefresh();
            }
          }
        },

        // Limpiar errores
        clearError: () => {
          set({ error: null });
        },

        // Resetear store
        reset: () => {
          get().stopAutoRefresh();
          
          set({
            notifications: [],
            unreadCount: 0,
            loading: false,
            error: null,
            filters: {
              unreadOnly: false,
              type: null,
              dateRange: null,
            },
            refreshInterval: null,
          });
        },
      }),
      {
        name: 'notification-store',
        partialize: (state) => ({
          // Solo persistir datos importantes
          notifications: state.notifications.slice(0, 20), // Limitar persistencia
          unreadCount: state.unreadCount,
          settings: state.settings,
          filters: state.filters,
        }),
      }
    ),
    {
      name: 'notification-store',
    }
  )
);

// Funciones auxiliares
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Hace unos segundos';
  if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function detectNotificationType(message) {
  if (message.includes('encuesta')) return 'survey';
  if (message.includes('comentario')) return 'comment';
  if (message.includes('respuesta')) return 'response';
  if (message.includes('reporte')) return 'report';
  return 'general';
}

function detectPriority(message) {
  if (message.includes('urgente') || message.includes('importante')) return 'high';
  if (message.includes('reporte') || message.includes('problema')) return 'medium';
  return 'low';
}

function isToday(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isThisWeek(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= weekAgo;
}

function showToastNotification(notification) {
  // Implementar toast notification aquí
  // Por ejemplo, usando react-hot-toast o similar
}

export default useNotificationStore;