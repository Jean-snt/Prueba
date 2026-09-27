import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  // ✅ NUEVO: Para navegación
import {
  Box,
  IconButton,
  Badge,
  Menu,
  Typography,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Dialog,  // ✅ NUEVO
  DialogTitle,  // ✅ NUEVO
  DialogContent,  // ✅ NUEVO
  DialogActions,  // ✅ NUEVO
} from '@mui/material';
import {
  Notifications,
  NotificationsNone,
  Circle,
  CheckCircle,
  Info,
  Warning,
  Error,
  Clear,
  DeleteSweep,  // ✅ NUEVO: Icono para vaciar bandeja
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const NotificationCenter = () => {
  const navigate = useNavigate();  // ✅ NUEVO: Hook de navegación
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllDialog, setShowAllDialog] = useState(false);  // ✅ NUEVO: Estado para dialog de todas las notificaciones
  const [allNotifications, setAllNotifications] = useState([]);  // ✅ NUEVO: Todas las notificaciones

  useEffect(() => {
    // SOLO cargar notificaciones si hay usuario logueado
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user && localStorage.getItem('token')) {
          loadNotifications();
          const interval = setInterval(() => {
            if (localStorage.getItem('token')) {
              loadNotifications();
            }
          }, 30000);
          
          return () => {
            clearInterval(interval);
          };
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // SOLO se ejecuta una vez al montar

  const loadNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      const response = await surveyAPI.getNotifications(false, 10);
      const allNotifications = response.data.notifications || [];
      
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentNotifications = allNotifications.filter(notif => {
        const notifDate = new Date(notif.created_at);
        return notifDate >= threeDaysAgo;
      });
      
      const newUnreadCount = response.data.unread_count || 0;
      
      if (JSON.stringify(recentNotifications) !== JSON.stringify(notifications) || newUnreadCount !== unreadCount) {
        setNotifications(recentNotifications);
        setUnreadCount(newUnreadCount);
      }
      
      setError('');
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setError('Error al cargar notificaciones');
    }
  };

  const handleMenuOpen = async (event) => {
    setAnchorEl(event.currentTarget);
    
    // ✅ CRÍTICO: Marcar todas como leídas al abrir el menú
    if (unreadCount > 0) {
      try {
        await surveyAPI.markAllNotificationsRead();
        setUnreadCount(0);
        // Actualizar notificaciones para reflejar que están leídas
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: true }))
        );
      } catch (err) {
        console.error('Error marcando notificaciones como leídas:', err);
      }
    }
    
    if (notifications.length === 0) {
      loadNotifications();
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId) => {
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
      // Error silenciado
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await surveyAPI.markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marcando todas como leídas:', err);
      setError('Error al marcar notificaciones como leídas');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (message) => {
    if (message.includes('error') || message.includes('problema')) {
      return <Error color="error" />;
    }
    if (message.includes('advertencia') || message.includes('atención')) {
      return <Warning color="warning" />;
    }
    if (message.includes('nueva') || message.includes('creado')) {
      return <Info color="info" />;
    }
    return <CheckCircle color="success" />;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'ahora mismo';
    } else if (diffInMinutes < 60) {
      return `hace ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `hace ${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `hace ${diffInDays}d`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const formatNotificationMessage = (message) => {
    // Mejorar el formato de los mensajes de notificación
    if (message.includes('respondió a tu encuesta')) {
      const username = message.split(' ')[0];
      return `${username} respondió a tu encuesta`;
    }
    if (message.includes('comentario en tu encuesta')) {
      const username = message.match(/por (\w+)/)?.[1] || 'Alguien';
      return `${username} comentó en tu encuesta`;
    }
    if (message.includes('nueva respuesta')) {
      const username = message.match(/por (\w+)/)?.[1] || 'Alguien';
      return `${username} respondió a un comentario`;
    }
    return message;
  };

  // ✅ NUEVO: Función para cargar todas las notificaciones
  const loadAllNotifications = async () => {
    setLoading(true);
    try {
      const response = await surveyAPI.getNotifications(false, 50);  // Cargar hasta 50 notificaciones
      const allNotifs = response.data.notifications || [];
      
      // Filtrar últimos 3 días
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentNotifs = allNotifs.filter(notif => {
        const notifDate = new Date(notif.created_at);
        return notifDate >= threeDaysAgo;
      });
      
      setAllNotifications(recentNotifs);
      setShowAllDialog(true);
    } catch (err) {
      setError('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Borrar notificación individual
  const deleteNotification = async (notificationId) => {
    try {
      await surveyAPI.deleteNotification(notificationId);
      
      // Actualizar listas locales
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setAllNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Actualizar contador si era no leída
      const deletedNotif = notifications.find(n => n.id === notificationId);
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      setError('Error al eliminar notificación');
    }
  };

  // ✅ NUEVO: Vaciar bandeja (borrar todas)
  const deleteAllNotifications = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) {
      return;
    }
    
    try {
      setLoading(true);
      await surveyAPI.deleteAllNotifications();
      
      setNotifications([]);
      setAllNotifications([]);
      setUnreadCount(0);
      
      alert('Todas las notificaciones han sido eliminadas');
    } catch (err) {
      setError('Error al eliminar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  // ✅ SOLUCIÓN TÉCNICA DEFINITIVA: Navegación real con survey_id
  const handleNotificationClick = (notification) => {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Cerrar menús
    handleMenuClose();
    setShowAllDialog(false);
    
    // ✅ NAVEGACIÓN INTELIGENTE: Usar survey_id si existe
    const targetId = notification.survey_id || notification.object_id;
    if (targetId) {
      navigate(`/encuestas/${targetId}`);
    } else {
      // Fallback: navegar a lista general
      navigate('/encuestas');
    }
  };

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        sx={{ color: 'white' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <Notifications /> : <NotificationsNone />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 350,
              maxWidth: 400,
              maxHeight: 500,
              borderRadius: 2,
            }
          }
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notificaciones
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} nuevas`}
                color="primary"
                size="small"
              />
            )}
          </Box>
          <Box display="flex" gap={1} mt={1}>
            {notifications.length > 0 && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={deleteAllNotifications}
                disabled={loading}
              >
                Vaciar bandeja
              </Button>
            )}
          </Box>
        </Box>

        {/* Error message */}
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" size="small">
              {error}
            </Alert>
          </Box>
        )}

        {/* Notifications list */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNone sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No tienes notificaciones nuevas por ahora
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {notification.is_read ? (
                      getNotificationIcon(notification.message)
                    ) : (
                      <Circle color="primary" sx={{ fontSize: 12 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: notification.is_read ? 400 : 600,
                          lineHeight: 1.4,
                          fontFamily: 'Inter, Roboto, sans-serif',
                        }}
                      >
                        {formatNotificationMessage(notification.message)}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(notification.created_at)}
                      </Typography>
                    }
                  />
                  {/* ✅ NUEVO: Botón X para borrar individual */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    sx={{ 
                      ml: 1,
                      '&:hover': {
                        color: 'error.main'
                      }
                    }}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button
                size="small"
                onClick={() => {
                  handleMenuClose();
                  loadAllNotifications();  // ✅ NUEVO: Cargar todas las notificaciones
                }}
                disabled={loading}
              >
                Ver todas las notificaciones
              </Button>
            </Box>
          </>
        )}
      </Menu>

      {/* ✅ NUEVO: Dialog para mostrar todas las notificaciones */}
      <Dialog
        open={showAllDialog}
        onClose={() => setShowAllDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Todas las Notificaciones (últimos 3 días)
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {allNotifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsNone sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No tienes notificaciones recientes
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
              {allNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {notification.is_read ? (
                        getNotificationIcon(notification.message)
                      ) : (
                        <Circle color="primary" sx={{ fontSize: 12 }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.is_read ? 400 : 600,
                            lineHeight: 1.4,
                            fontFamily: 'Inter, Roboto, sans-serif',
                          }}
                        >
                          {formatNotificationMessage(notification.message)}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(notification.created_at)}
                        </Typography>
                      }
                    />
                    {/* ✅ NUEVO: Botón X para borrar individual */}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      sx={{ 
                        ml: 1,
                        '&:hover': {
                          color: 'error.main'
                        }
                      }}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  </ListItem>
                  {index < allNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAllDialog(false)}>
            Cerrar
          </Button>
          {allNotifications.some(n => !n.is_read) && (
            <Button onClick={markAllAsRead} variant="contained">
              Marcar todas como leídas
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationCenter;