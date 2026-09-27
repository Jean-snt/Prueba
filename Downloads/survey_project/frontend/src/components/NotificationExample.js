import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import NotificationCenter from './NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';

const NotificationExample = () => {
  const { notifications, unreadCount, loading, error } = useNotifications();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Sistema de Notificaciones
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Las notificaciones se generan automáticamente cuando alguien responde a tus encuestas.
      </Alert>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Centro de Notificaciones
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <NotificationCenter />
          <Typography variant="body2">
            {unreadCount > 0 
              ? `Tienes ${unreadCount} notificación${unreadCount !== 1 ? 'es' : ''} sin leer`
              : 'No tienes notificaciones sin leer'
            }
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Últimas Notificaciones
        </Typography>
        {loading ? (
          <Typography>Cargando...</Typography>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : notifications.length === 0 ? (
          <Typography color="text.secondary">
            No tienes notificaciones aún
          </Typography>
        ) : (
          <Box>
            {notifications.slice(0, 5).map((notification) => (
              <Box
                key={notification.id}
                sx={{
                  p: 2,
                  mb: 1,
                  border: '1px solid',
                  borderColor: notification.is_read ? 'grey.300' : 'primary.main',
                  borderRadius: 1,
                  backgroundColor: notification.is_read ? 'transparent' : 'primary.50',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: notification.is_read ? 400 : 600,
                  }}
                >
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(notification.created_at).toLocaleString('es-ES')}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default NotificationExample;