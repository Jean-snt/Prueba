import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Container,
  Paper,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  People,
  Create,
  Notifications,
  AdminPanelSettings,
  Diamond,
  Warning,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import AdminSubscriptions from './AdminSubscriptions';
import StatsWidget from './StatsWidget';

 
const Dashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalSurveys: 0,
    totalResponses: 0,
    unreadNotifications: 0,
    // Admin stats
    totalUsers: 0,
    activeSubscriptions: 0,
    pendingReports: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const initDashboard = async () => {
      // Verificar usuario logueado
      const stored = localStorage.getItem('user');
      if (!stored) {
        navigate('/login');
        return;
      }

      let user;
      try {
        user = JSON.parse(stored);
        if (!isMounted) return;
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }

      // Check VIP status
      try {
        const subscriptionResponse = await surveyAPI.getUserSubscription();
        if (!isMounted) return;
        
        const subData = subscriptionResponse.data;
        const userIsVip = user.is_vip || 
                         (subData.has_subscription && subData.subscription?.status === 'active') ||
                         subData.is_vip;
        setIsVip(userIsVip);
      } catch (err) {
        if (!isMounted) return;
        setIsVip(user.is_vip || false);
      }

      // Load dashboard data
      try {
        if (!isMounted) return;
        setLoading(true);
        
        // Cargar estadísticas básicas
        const surveysResponse = await surveyAPI.getAllSurveys({ limit: 10 });
        if (!isMounted) return;
        
        const surveysData = surveysResponse.data.surveys || [];
        const totalResponses = surveysData.reduce((sum, survey) => sum + (survey.response_count || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalSurveys: surveysData.length,
          totalResponses: totalResponses,
        }));

        // Cargar notificaciones
        try {
          const notificationsResponse = await surveyAPI.getNotifications(false, 5);
          if (!isMounted) return;
          setStats(prev => ({
            ...prev,
            unreadNotifications: notificationsResponse.data.unread_count || 0
          }));
        } catch (err) {
          // Error silenciado
        }

        // Cargar estadísticas de admin si es staff
        if (user.is_staff === true) {
          try {
            const adminStatsResponse = await surveyAPI.getAdminStats();
            if (!isMounted) return;
            if (adminStatsResponse.data.success) {
              const adminStats = adminStatsResponse.data.stats;
              setStats(prev => ({
                ...prev,
                totalUsers: adminStats.users.total,
                activeSubscriptions: adminStats.subscriptions.active,
                pendingReports: adminStats.reports.pending,
              }));
            }
          } catch (err) {
            // Error silenciado
          }
        }

      } catch (error) {
        // Error silenciado
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initDashboard();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: isVip ? '#0f0f0f' : '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center', bgcolor: isVip ? '#1a1a1a' : '#FFFFFF', border: isVip ? '2px solid #ffd700' : 'none' }}>
            <LinearProgress sx={{ mb: 3, borderRadius: 2, bgcolor: isVip ? '#333' : undefined, '& .MuiLinearProgress-bar': { bgcolor: isVip ? '#ffd700' : undefined } }} />
            <Typography variant="h6" sx={{ fontFamily: 'Inter, Roboto, sans-serif', color: isVip ? '#ffd700' : '#333' }}>
              {isVip ? 'Cargando tu experiencia VIP de lujo...' : 'Cargando tu dashboard profesional...'}
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ✅ CORREGIDO: Redirigir a ruta /vip-dashboard en vez de renderizar inline
  if (isVip && !currentUser?.is_staff) {
    navigate('/vip-dashboard', { replace: true });
    return null;
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: isVip ? '#F8FAFC' : '#FFFFFF', 
      py: 3,
      width: '100%',
      overflowX: 'hidden', // ✅ RESPONSIVE FIX: Prevent horizontal scroll
    }} className={isVip ? 'vip-background' : ''}>
      <Container maxWidth="xl" sx={{ 
        px: { xs: 2, sm: 3, md: 3 }, // ✅ RESPONSIVE FIX: Proper padding on mobile
      }}>
        {/* Header del Dashboard */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 800,
              fontFamily: 'Inter, Roboto, sans-serif',
              color: '#1a1a1a',
              mb: 1,
              fontSize: { xs: '1.25rem', md: '2.25rem' },
            }}
          >
            Dashboard Profesional 📊
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              fontFamily: 'Inter, Roboto, sans-serif',
              color: '#666666',
              fontSize: { xs: '0.75rem', md: '1rem' },
            }}
          >
            {currentUser ? `Bienvenido ${currentUser.username}` : 'Tu plataforma de encuestas avanzada'}
            {isVip && (
              <Chip 
                icon={<Diamond />}
                label="VIP" 
                size="small" 
                sx={{ 
                  ml: 2,
                  background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                  color: '#333',
                  fontWeight: 'bold'
                }}
              />
            )}
          </Typography>
        </Box>

        {/* Widget de Estadísticas en Tiempo Real */}
        <Box sx={{ mb: 4 }}>
          <StatsWidget isVip={isVip} />
        </Box>

        {/* Pestañas para administradores */}
        {currentUser && currentUser.is_staff && (
          <Box sx={{ mb: 4 }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              variant="scrollable" // ✅ RESPONSIVE FIX: Scrollable tabs on mobile
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: { xs: '0.85rem', sm: '1rem' }, // ✅ RESPONSIVE FIX
                  fontFamily: 'Inter, Roboto, sans-serif',
                },
              }}
            >
              <Tab 
                icon={<Assessment />} 
                label="Dashboard General" 
                iconPosition="start"
              />
              <Tab 
                icon={<AdminPanelSettings />} 
                label="Suscripciones Pendientes" 
                iconPosition="start"
              />
            </Tabs>
          </Box>
        )}

        {/* Contenido según pestaña */}
        {(!currentUser?.is_staff || tabValue === 0) && (
          <>
            {/* Tarjetas de estadísticas */}
            <Grid 
              container 
              spacing={3} 
              sx={{ 
                mb: 4,
                width: '100%', // ✅ RESPONSIVE FIX: Full width
              }}
            >
              {/* Tarjetas para usuarios regulares y VIP */}
              {(!currentUser?.is_staff || tabValue === 0) && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(45deg, #8C4EFF, #7113B8)', 
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                      width: '100%', // ✅ RESPONSIVE FIX
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              {stats.totalSurveys}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              Encuestas Disponibles
                            </Typography>
                          </Box>
                          <Assessment sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(45deg, #4caf50, #66bb6a)', 
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                      width: '100%', // ✅ RESPONSIVE FIX
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              {stats.totalResponses}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              Respuestas Totales
                            </Typography>
                          </Box>
                          <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(45deg, #ff9800, #ffb74d)', 
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
                      width: '100%', // ✅ RESPONSIVE FIX
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              {stats.unreadNotifications}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              Notificaciones
                            </Typography>
                          </Box>
                          <Notifications sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(45deg, #e91e63, #f06292)', 
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(233, 30, 99, 0.3)',
                      width: '100%', // ✅ RESPONSIVE FIX
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              {isVip ? '∞' : '5'}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              Encuestas Permitidas
                            </Typography>
                          </Box>
                          <People sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}

              {/* Tarjetas especiales para administradores */}
              {currentUser?.is_staff && tabValue === 0 && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(45deg, #9c27b0, #e1bee7)', 
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(156, 39, 176, 0.3)',
                      width: '100%', // ✅ RESPONSIVE FIX
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              {stats.totalUsers}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              Usuarios Totales
                            </Typography>
                          </Box>
                          <People sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(45deg, #ffd700, #ffed4e)', 
                      color: '#333',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)',
                      width: '100%', // ✅ RESPONSIVE FIX
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              {stats.activeSubscriptions}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              Suscripciones Activas
                            </Typography>
                          </Box>
                          <Diamond sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(45deg, #f44336, #ef5350)', 
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)',
                      width: '100%', // ✅ RESPONSIVE FIX
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              {stats.pendingReports}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              Reportes Pendientes
                            </Typography>
                          </Box>
                          <Warning sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(45deg, #607d8b, #90a4ae)', 
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(96, 125, 139, 0.3)',
                      width: '100%', // ✅ RESPONSIVE FIX
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              {stats.totalSurveys}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Inter, Roboto, sans-serif' }}>
                              Encuestas Totales
                            </Typography>
                          </Box>
                          <Assessment sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>

            {/* Acciones rápidas */}
            <Paper sx={{ 
              p: 3, 
              mb: 4, 
              borderRadius: 3, 
              bgcolor: '#FFFFFF',
              width: '100%', // ✅ RESPONSIVE FIX
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 3,
                  fontFamily: 'Inter, Roboto, sans-serif',
                  color: '#1a1a1a',
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }, // ✅ RESPONSIVE FIX
                }}
              >
                🚀 Acciones Rápidas
              </Typography>
              <Grid 
                container 
                spacing={2} 
                justifyContent="center"
                sx={{
                  width: '100%', // ✅ RESPONSIVE FIX
                  flexDirection: { xs: 'column', sm: 'row' }, // ✅ RESPONSIVE FIX: Stack on mobile
                }}
              >
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    component={Link}
                    to="/create"
                    fullWidth
                    variant="contained"
                    startIcon={<Create />}
                    sx={{ 
                      py: 3,
                      borderRadius: 3,
                      fontFamily: 'Inter, Roboto, sans-serif',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                        boxShadow: '0 6px 25px rgba(102, 126, 234, 0.4)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    ✨ Crear Nueva Encuesta
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    component={Link}
                    to="/encuestas"
                    fullWidth
                    variant="outlined"
                    startIcon={<Assessment />}
                    sx={{ 
                      py: 3,
                      borderRadius: 3,
                      borderColor: '#4caf50',
                      color: '#4caf50',
                      fontFamily: 'Inter, Roboto, sans-serif',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#45a049',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    📊 Ver Encuestas
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}

        {/* Panel de Administración */}
        {currentUser?.is_staff && tabValue === 1 && (
          <AdminSubscriptions />
        )}
      </Container>
    </Box>
  );
};

export default Dashboard;