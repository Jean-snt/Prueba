import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Lock, 
  Diamond, 
  TrendingUp 
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import Swal from 'sweetalert2';

const VipProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    checkVipStatus();
  }, []);

  const checkVipStatus = async () => {
    try {
      setLoading(true);
      
      // Verificar usuario logueado
      const stored = localStorage.getItem('user');
      if (!stored) {
        navigate('/login');
        return;
      }

      const user = JSON.parse(stored);
      setCurrentUser(user);

      // Verificar suscripción VIP
      try {
        const subscriptionResponse = await surveyAPI.getUserSubscription();
        const subData = subscriptionResponse.data;
        
        setSubscription(subData.subscription);
        
        // Verificar si es VIP (usuario con is_vip o suscripción activa)
        const userIsVip = user.is_vip || 
                         (subData.has_subscription && subData.subscription?.status === 'active') ||
                         subData.is_vip;
        
        setIsVip(userIsVip);

      } catch (err) {
        setIsVip(user.is_vip || false);
      }

    } catch (error) {
      console.error('Error checking VIP status:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToVip = () => {
    // Mostrar alerta elegante antes de redirigir
    Swal.fire({
      icon: 'info',
      title: '🔒 Función Exclusiva VIP',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 60px; margin-bottom: 20px;">💎</div>
          <p style="font-size: 18px; color: #666; margin-bottom: 15px;">
            Esta función es exclusiva para miembros VIP
          </p>
          <p style="font-size: 16px; color: #4caf50; font-weight: bold;">
            ¡Únete al club premium y desbloquea todas las funciones!
          </p>
        </div>
      `,
      confirmButtonText: 'Ver Planes VIP',
      confirmButtonColor: '#667eea',
      showCancelButton: true,
      cancelButtonText: 'Volver',
      cancelButtonColor: '#9e9e9e',
      background: '#fff',
      customClass: {
        popup: 'swal-popup-custom',
        title: 'swal-title-custom',
        confirmButton: 'swal-button-custom'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        navigate('/vip');
      } else {
        navigate('/encuestas');
      }
    });
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          minHeight="60vh"
        >
          <CircularProgress size={60} sx={{ color: '#667eea', mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Verificando acceso VIP...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!isVip) {
    return (
      <Container maxWidth="md">
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          minHeight="70vh"
          textAlign="center"
        >
          <Card 
            sx={{ 
              p: 4, 
              borderRadius: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ffd700 100%)',
              color: 'white',
              maxWidth: 500,
              width: '100%'
            }}
          >
            <CardContent>
              <Lock sx={{ fontSize: 80, mb: 3, opacity: 0.9 }} />
              
              <Typography variant="h3" fontWeight="bold" mb={2}>
                🔒 Acceso Restringido
              </Typography>
              
              <Typography variant="h6" mb={3} sx={{ opacity: 0.9 }}>
                Esta función es exclusiva para miembros VIP
              </Typography>
              
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 3, 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  '& .MuiAlert-icon': { color: '#ffd700' }
                }}
              >
                <Typography variant="body1">
                  <strong>Dashboard Avanzado</strong> incluye estadísticas detalladas, 
                  gráficos interactivos y análisis profundo de encuestas.
                </Typography>
              </Alert>

              <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Diamond />}
                  onClick={handleUpgradeToVip}
                  sx={{
                    background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                    color: '#333',
                    fontWeight: 'bold',
                    px: 4,
                    py: 1.5,
                    '&:hover': {
                      background: 'linear-gradient(45deg, #ffed4e, #ffd700)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Hacerse VIP
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<TrendingUp />}
                  onClick={() => navigate('/encuestas')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    '&:hover': {
                      borderColor: '#ffd700',
                      backgroundColor: 'rgba(255,215,0,0.1)',
                    }
                  }}
                >
                  Ver Encuestas
                </Button>
              </Box>

              {subscription && subscription.status === 'pending' && (
                <Alert 
                  severity="warning" 
                  sx={{ 
                    mt: 3,
                    backgroundColor: 'rgba(255,193,7,0.1)',
                    color: 'white',
                    '& .MuiAlert-icon': { color: '#ffc107' }
                  }}
                >
                  <Typography variant="body2">
                    <strong>Pago en Revisión:</strong> Tu suscripción está siendo verificada. 
                    Te notificaremos cuando sea aprobada.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // Si es VIP, renderizar el contenido protegido
  return children;
};

export default VipProtectedRoute;