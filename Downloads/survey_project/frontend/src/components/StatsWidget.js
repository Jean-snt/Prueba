import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Assessment,
  People,
  TrendingUp,
  Visibility,
  Diamond,
  Refresh,
  Timeline,
  Public,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const StatsWidget = ({ isVip = false }) => {
  const [stats, setStats] = useState({
    totalSurveys: 0,
    totalResponses: 0,
    activeUsers: 0,
    vipUsers: 0,
    popularSurvey: null,
    recentActivity: [],
    loading: true
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      
      // Obtener encuestas
      const surveysResponse = await surveyAPI.getAllSurveys({ limit: 100 });
      const surveys = surveysResponse.data.surveys || [];
      
      // Calcular estadísticas
      const totalSurveys = surveys.length;
      const totalResponses = surveys.reduce((sum, survey) => sum + (survey.response_count || 0), 0);
      
      // Encontrar encuesta más popular
      const popularSurvey = surveys.reduce((prev, current) => 
        (current.response_count || 0) > (prev.response_count || 0) ? current : prev
      , surveys[0]);

      // Simular usuarios activos (en una implementación real vendría del backend)
      const activeUsers = Math.floor(Math.random() * 50) + 20;
      const vipUsers = Math.floor(Math.random() * 10) + 5;

      setStats({
        totalSurveys,
        totalResponses,
        activeUsers,
        vipUsers,
        popularSurvey,
        recentActivity: surveys.slice(0, 5), // Últimas 5 encuestas
        loading: false
      });
    } catch (error) {
      setStats(prev => ({ ...prev, loading: false }));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadInitialStats = async () => {
      try {
        setRefreshing(true);
        
        // Obtener encuestas
        const surveysResponse = await surveyAPI.getAllSurveys({ limit: 100 });
        if (!isMounted) return;
        
        const surveys = surveysResponse.data.surveys || [];
        
        // Calcular estadísticas
        const totalSurveys = surveys.length;
        const totalResponses = surveys.reduce((sum, survey) => sum + (survey.response_count || 0), 0);
        
        // Encontrar encuesta más popular
        const popularSurvey = surveys.reduce((prev, current) => 
          (current.response_count || 0) > (prev.response_count || 0) ? current : prev
        , surveys[0]);

        // Simular usuarios activos (en una implementación real vendría del backend)
        const activeUsers = Math.floor(Math.random() * 50) + 20;
        const vipUsers = Math.floor(Math.random() * 10) + 5;

        if (!isMounted) return;
        
        setStats({
          totalSurveys,
          totalResponses,
          activeUsers,
          vipUsers,
          popularSurvey,
          recentActivity: surveys.slice(0, 5), // Últimas 5 encuestas
          loading: false
        });
      } catch (error) {
        if (isMounted) {
          setStats(prev => ({ ...prev, loading: false }));
        }
      } finally {
        if (isMounted) {
          setRefreshing(false);
        }
      }
    };

    loadInitialStats();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      if (isMounted) {
        fetchStats();
      }
    }, 30000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const StatCard = ({ title, value, icon, color, subtitle, progress }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: isVip 
          ? `linear-gradient(135deg, ${color}15, ${color}05)`
          : 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: isVip ? `1px solid ${color}30` : '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isVip 
            ? `0 8px 25px ${color}20`
            : '0 8px 25px rgba(0,0,0,0.1)',
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box 
            sx={{ 
              p: 1.5,
              borderRadius: 2,
              background: `${color}20`,
              color: color,
            }}
          >
            {icon}
          </Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              color: isVip ? color : 'white',
              textShadow: isVip ? 'none' : '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {value}
          </Typography>
        </Box>
        
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600,
            color: isVip ? '#333' : 'white',
            mb: 0.5
          }}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: isVip ? '#666' : 'rgba(255,255,255,0.7)',
              mb: progress !== undefined ? 1 : 0
            }}
          >
            {subtitle}
          </Typography>
        )}
        
        {progress !== undefined && (
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: isVip ? `${color}20` : 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: color,
                borderRadius: 3,
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );

  if (stats.loading) {
    return (
      <Paper 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          background: isVip ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: isVip ? '1px solid #e0e0e0' : '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2, color: isVip ? '#666' : 'white' }}>
          Cargando estadísticas...
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header con botón de actualizar */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Timeline sx={{ fontSize: 32, color: isVip ? '#8C4EFF' : 'white' }} />
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                color: isVip ? '#333' : 'white'
              }}
            >
              📊 Estadísticas en Tiempo Real
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ color: isVip ? '#666' : 'rgba(255,255,255,0.7)' }}
            >
              Actualizado automáticamente cada 30 segundos
            </Typography>
          </Box>
        </Box>
        
        <Tooltip title="Actualizar estadísticas">
          <IconButton 
            onClick={fetchStats}
            disabled={refreshing}
            sx={{ 
              color: isVip ? '#8C4EFF' : 'white',
              '&:hover': {
                backgroundColor: isVip ? 'rgba(102, 126, 234, 0.1)' : 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <Refresh sx={{ 
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Encuestas Totales"
            value={stats.totalSurveys}
            icon={<Assessment />}
            color="#8C4EFF"
            subtitle="Encuestas activas"
            progress={Math.min((stats.totalSurveys / 50) * 100, 100)}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Respuestas"
            value={stats.totalResponses}
            icon={<Visibility />}
            color="#f093fb"
            subtitle="Participaciones totales"
            progress={Math.min((stats.totalResponses / 200) * 100, 100)}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Usuarios Activos"
            value={stats.activeUsers}
            icon={<People />}
            color="#4facfe"
            subtitle="Conectados ahora"
            progress={Math.min((stats.activeUsers / 100) * 100, 100)}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Usuarios VIP"
            value={stats.vipUsers}
            icon={<Diamond />}
            color="#ffd700"
            subtitle="Suscripciones activas"
            progress={Math.min((stats.vipUsers / 20) * 100, 100)}
          />
        </Grid>
      </Grid>

      {/* Encuesta más popular */}
      {stats.popularSurvey && (
        <Paper 
          sx={{ 
            p: 3,
            mb: 3,
            background: isVip 
              ? 'linear-gradient(135deg, #8C4EFF15, #7113B805)'
              : 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: isVip ? '1px solid #8C4EFF30' : '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <TrendingUp sx={{ color: '#ff6b6b' }} />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                color: isVip ? '#333' : 'white'
              }}
            >
              🔥 Encuesta Más Popular
            </Typography>
            <Chip 
              label={`${stats.popularSurvey.response_count || 0} respuestas`}
              size="small"
              sx={{
                background: '#ff6b6b20',
                color: '#ff6b6b',
                fontWeight: 'bold'
              }}
            />
          </Box>
          
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 500,
              color: isVip ? '#333' : 'white',
              mb: 1
            }}
          >
            {stats.popularSurvey.title}
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: isVip ? '#666' : 'rgba(255,255,255,0.7)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {stats.popularSurvey.description}
          </Typography>
        </Paper>
      )}

      {/* Actividad reciente */}
      <Paper 
        sx={{ 
          p: 3,
          background: isVip ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: isVip ? '1px solid #e0e0e0' : '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Public sx={{ color: isVip ? '#4facfe' : 'white' }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              color: isVip ? '#333' : 'white'
            }}
          >
            📈 Actividad Reciente
          </Typography>
        </Box>
        
        {stats.recentActivity.map((survey, index) => (
          <Box 
            key={survey.id}
            display="flex" 
            alignItems="center" 
            justifyContent="space-between"
            py={1.5}
            sx={{
              borderBottom: index < stats.recentActivity.length - 1 
                ? `1px solid ${isVip ? '#e0e0e0' : 'rgba(255,255,255,0.1)'}`
                : 'none'
            }}
          >
            <Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  color: isVip ? '#333' : 'white'
                }}
              >
                {survey.title}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ color: isVip ? '#666' : 'rgba(255,255,255,0.7)' }}
              >
                por {survey.creator?.username || 'Usuario anónimo'}
              </Typography>
            </Box>
            
            <Chip 
              label={`${survey.response_count || 0} respuestas`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: isVip ? '#4facfe' : 'rgba(255,255,255,0.3)',
                color: isVip ? '#4facfe' : 'white'
              }}
            />
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default StatsWidget;