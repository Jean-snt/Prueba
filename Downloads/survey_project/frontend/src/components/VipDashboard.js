import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Container,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  People,
  Create,
  Diamond,
  Public,
  Timeline,
  Today,
  DateRange,
  CalendarMonth,
  CalendarToday,
  AccessTime,
  Delete,
  Star,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { surveyAPI } from '../services/api';

const VipDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSurveys: 0,
    totalResponses: 0,
    totalComments: 0,
    karma: 0,
    activeSurveys: 0,  // ✅ NUEVO
    deletedSurveys: 0,  // ✅ NUEVO
  });
  const [visitStats, setVisitStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    totalSurveyViews: 0,  // ✅ NUEVO: Total de vistas a encuestas
  });
  const [sessionTime, setSessionTime] = useState(0);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [weeklyUsage, setWeeklyUsage] = useState([]);  // ✅ NUEVO: Uso semanal (tiempo conectado)
  const [countryStats, setCountryStats] = useState([]);
  // ✅ ELIMINADO: Contador animado - Valores estáticos inmediatos
  // const [animatedCount, setAnimatedCount] = useState(0);

  const COLORS = ['#ffd700', '#ffed4e', '#ffc107', '#ff9800', '#ff5722'];

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
      } catch (e) {
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    loadVipDashboardData();
  }, []); // ✅ FIX: Array vacío para ejecutar solo una vez al montar

  // ✅ PERSISTENCIA POR USUARIO: Cronómetro que sobrevive al logout
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const userId = currentUser.id;
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(`vip_session_date_${userId}`);
    const storedTime = localStorage.getItem(`vip_time_${userId}`);
    
    let accumulatedTime = 0;
    
    // Si es un día nuevo, resetear el contador
    if (storedDate !== today) {
      localStorage.setItem(`vip_session_date_${userId}`, today);
      localStorage.setItem(`vip_time_${userId}`, '0');
    } else {
      // Mismo día: recuperar tiempo acumulado
      accumulatedTime = parseInt(storedTime || '0', 10);
    }
    
    // Guardar timestamp de inicio de esta sesión
    const sessionStart = Date.now();
    
    // Actualizar cada segundo Y guardar en localStorage
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      const totalTime = accumulatedTime + elapsed;
      setSessionTime(totalTime);
      
      // ✅ CRÍTICO: Guardar en localStorage cada segundo con userId
      localStorage.setItem(`vip_time_${userId}`, totalTime.toString());
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser]);

  // ✅ Formatear tiempo de sesión (HH:MM:SS)
  const formatSessionTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ ELIMINADO: Efecto de contador animado - Valores estáticos
  // useEffect(() => {
  //   if (stats.totalSurveys > 0 && animatedCount < stats.totalSurveys) {
  //     const timer = setTimeout(() => {
  //       setAnimatedCount(prev => Math.min(prev + 1, stats.totalSurveys));
  //     }, 50);
  //     return () => clearTimeout(timer);
  //   }
  // }, [stats.totalSurveys, animatedCount]);

  // ✅ FIX HOISTING: Función tradicional async para evitar error de inicialización
  async function loadVipDashboardData() {
    try {
      setLoading(true);
      
      // ✅ DATA REAL: Cargar encuestas del backend
      const surveysResponse = await surveyAPI.getAllSurveys({ limit: 100 });
      const surveysData = surveysResponse.data.surveys || [];
      
      // ✅ FIX DATOS 0: Solo calcular si hay datos reales
      if (surveysData.length === 0) {
        setLoading(false);
        return;
      }
      
      // ✅ NUEVO: Obtener estadísticas de encuestas desde el backend
      let totalSurveys = 0;
      let activeSurveys = 0;
      let deletedSurveys = 0;
      let dailySurveyCounts = [];  // ✅ NUEVO: Conteo histórico desde backend
      
      try {
        const surveyStatsResponse = await surveyAPI.getUserSurveyStats();
        const surveyStats = surveyStatsResponse.data.stats;
        
        totalSurveys = surveyStats.total_surveys || 0;
        activeSurveys = surveyStats.active_surveys || 0;
        deletedSurveys = surveyStats.deleted_surveys || 0;
        dailySurveyCounts = surveyStatsResponse.data.daily_survey_counts || [];
        
      } catch (err) {
        // Fallback: contar desde surveysData (solo activas)
        activeSurveys = surveysData.length;
        totalSurveys = activeSurveys;
        deletedSurveys = 0;
        dailySurveyCounts = [];
      }
      
      // ✅ NUEVA LÓGICA: Separar Respuestas y Comentarios
      // Respuestas = Solo respuestas a comentarios (parent_id != null)
      // Comentarios = Total absoluto (raíz + respuestas)
      let totalReplies = 0;  // Respuestas a comentarios
      let totalComments = 0;  // Total absoluto
      
      // ✅ FIX: Función recursiva para contar TODAS las respuestas anidadas
      const countAllReplies = (comments) => {
        let count = 0;
        for (const comment of comments) {
          if (comment.parent_id !== null) {
            count++; // Es una respuesta
          }
          if (comment.replies && comment.replies.length > 0) {
            count += countAllReplies(comment.replies); // Contar respuestas anidadas
          }
        }
        return count;
      };
      
      // ✅ FIX: Función recursiva para contar TODOS los comentarios (raíz + anidados)
      const countAllComments = (comments) => {
        let count = comments.length;
        for (const comment of comments) {
          if (comment.replies && comment.replies.length > 0) {
            count += countAllComments(comment.replies);
          }
        }
        return count;
      };
      
      // Obtener comentarios de cada encuesta para contar correctamente
      for (const survey of surveysData) {
        try {
          const commentsResponse = await surveyAPI.getSurveyComments(survey.id);
          const comments = commentsResponse.data.comments || [];
          
          // Total absoluto de comentarios (incluyendo anidados)
          totalComments += countAllComments(comments);
          
          // Contar solo respuestas (incluyendo anidadas y anónimas)
          totalReplies += countAllReplies(comments);
        } catch (err) {
          // Si falla, usar response_count como fallback
          totalComments += (survey.response_count || 0);
        }
      }
      
      // ✅ NUEVA LÓGICA: Karma VIP = Usuarios únicos ayudados
      let uniqueUsersHelped = 0;
      try {
        // Obtener el conteo de usuarios únicos a los que les has otorgado karma
        const vipKarmaResponse = await surveyAPI.getVipKarmaStats();
        uniqueUsersHelped = vipKarmaResponse.data.unique_users_helped || 0;
      } catch (err) {
        // Error silenciado
      }
      
      setStats({
        totalSurveys: totalSurveys,
        totalResponses: totalReplies,  // Solo respuestas a comentarios
        totalComments: totalComments,   // Total absoluto
        karma: uniqueUsersHelped,       // Usuarios únicos ayudados
        activeSurveys: activeSurveys,
        deletedSurveys: deletedSurveys,
      });

      // ✅ MIGRACIÓN A BACKEND: Obtener estadísticas de visitas desde la API
      try {
        const viewStatsResponse = await surveyAPI.getUserViewStats();
        
        const apiStats = viewStatsResponse.data.stats;
        
        setVisitStats({
          today: apiStats.today || 0,
          thisWeek: apiStats.this_week || 0,
          thisMonth: apiStats.this_month || 0,
          thisYear: apiStats.this_year || 0,
          totalSurveyViews: apiStats.total_survey_views || 0,  // ✅ NUEVO: Total de vistas a encuestas
        });
        
        // ✅ FIX: Ordenar daily_views por weekday para asegurar Lunes-Domingo
        const dailyViewsData = viewStatsResponse.data.daily_views || [];
        const sortedDailyViews = dailyViewsData.sort((a, b) => a.weekday - b.weekday);
        
        const weeklyData = generateWeeklyActivity(sortedDailyViews, dailySurveyCounts);
        setWeeklyActivity(weeklyData);
      } catch (err) {
        // Fallback a valores en 0
        setVisitStats({
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          thisYear: 0,
          totalSurveyViews: 0,  // ✅ NUEVO
        });
        
        // Generar datos vacíos para el gráfico
        const weeklyData = generateWeeklyActivity([], []);
        setWeeklyActivity(weeklyData);
      }

      // ✅ NUEVO: Uso Semanal (tiempo conectado)
      if (currentUser?.id) {
        const usageData = generateWeeklyUsage(currentUser.id);
        setWeeklyUsage(usageData);
      }

      const countryData = generateCountryStats(surveysData);
      setCountryStats(countryData);

    } catch (error) {
      // Error silenciado
    } finally {
      setLoading(false);
    }
  }

  // ✅ FIX HOISTING: Función tradicional para evitar problemas de referencia
  function generateWeeklyActivity(dailyViewsFromAPI = [], dailySurveyCountsFromAPI = []) {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const weekData = [];

    // ✅ FIX: Si no hay datos de la API, generar semana calendario actual con valor 0
    if (!dailyViewsFromAPI || dailyViewsFromAPI.length === 0) {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajustar para que Lunes=0
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        
        weekData.push({
          day: `${days[i]} ${dayDate.getDate()}`,
          encuestas: 0,
          participacion: 0,
          is_future: dayDate > today
        });
      }
      
      return weekData;
    }

    // ✅ FIX: Usar los datos de la API (semana calendario actual)
    for (let i = 0; i < 7; i++) {
      const dayView = dailyViewsFromAPI[i];
      const daySurveyCount = dailySurveyCountsFromAPI[i];
      
      if (dayView) {
        // ✅ CRÍTICO: Usar conteo histórico del backend (NO filtrar por is_active)
        const surveysCreated = daySurveyCount?.count ?? 0;

        weekData.push({
          day: `${dayView.day_name} ${dayView.day_number}`,
          encuestas: surveysCreated,  // ✅ Conteo histórico desde backend
          participacion: dayView.count,  // ✅ Visitas únicas
          is_future: dayView.is_future || false
        });
      } else {
        // Fallback si falta un día específico
        weekData.push({
          day: days[i],
          encuestas: 0,
          participacion: 0,
          is_future: false
        });
      }
    }

    return weekData;
  }

  // ✅ NUEVO: Generar uso semanal (tiempo conectado por día)
  function generateWeeklyUsage(userId) {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    
    // Verificar si es Domingo a las 11:59 PM (reseteo semanal)
    const hours = today.getHours();
    const minutes = today.getMinutes();
    const isDomingoNoche = currentDay === 0 && hours === 23 && minutes === 59;
    
    // Obtener datos de la semana actual
    const weekKey = `vip_weekly_usage_${userId}`;
    const weekStartKey = `vip_week_start_${userId}`;
    const storedWeekStart = localStorage.getItem(weekStartKey);
    
    // Calcular inicio de semana (Lunes)
    const mondayDate = new Date(today);
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    mondayDate.setDate(today.getDate() - daysSinceMonday);
    const weekStart = mondayDate.toDateString();
    
    // Si es una nueva semana o es Domingo noche, resetear
    if (storedWeekStart !== weekStart || isDomingoNoche) {
      // Guardar semana anterior en histórico si existe
      const currentWeekData = localStorage.getItem(weekKey);
      if (currentWeekData && isDomingoNoche) {
        const historyKey = `vip_weekly_history_${userId}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        history.push({
          weekStart: storedWeekStart,
          data: JSON.parse(currentWeekData),
          timestamp: today.toISOString()
        });
        // Mantener solo últimas 4 semanas
        if (history.length > 4) history.shift();
        localStorage.setItem(historyKey, JSON.stringify(history));
      }
      
      // Resetear para nueva semana
      localStorage.setItem(weekStartKey, weekStart);
      localStorage.setItem(weekKey, JSON.stringify({}));
    }
    
    // Cargar datos de la semana
    const weekData = JSON.parse(localStorage.getItem(weekKey) || '{}');
    
    // Construir array de 7 días
    const usageData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + i);
      const dayKey = date.toDateString();
      const dayName = days[i];
      
      // Obtener minutos para ese día (convertir segundos a minutos)
      const seconds = weekData[dayKey] || 0;
      const minutes = Math.floor(seconds / 60);
      
      usageData.push({
        day: dayName,
        minutos: minutes,
        horas: (minutes / 60).toFixed(1)
      });
    }
    
    return usageData;
  }

  // ✅ FIX BUCLE: Actualizar uso semanal solo cuando cambia currentUser
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const updateWeeklyUsage = () => {
      const userId = currentUser.id;
      const today = new Date().toDateString();
      const weekKey = `vip_weekly_usage_${userId}`;
      const weekData = JSON.parse(localStorage.getItem(weekKey) || '{}');
      
      // Obtener tiempo acumulado hoy
      const todayTime = parseInt(localStorage.getItem(`vip_time_${userId}`) || '0', 10);
      weekData[today] = todayTime;
      
      localStorage.setItem(weekKey, JSON.stringify(weekData));
      
      // Regenerar gráfico
      setWeeklyUsage(generateWeeklyUsage(userId));
    };
    
    // Actualizar inmediatamente
    updateWeeklyUsage();
    
    // Actualizar cada minuto
    const interval = setInterval(updateWeeklyUsage, 60000);
    
    return () => clearInterval(interval);
  }, [currentUser]); // ✅ FIX: Solo depende de currentUser, NO de sessionTime

  // ✅ FIX HOISTING: Función tradicional
  function generateCountryStats(surveys) {
    const countryMap = {};
    
    surveys.forEach(survey => {
      if (survey.creator && survey.creator.country) {
        const countryName = survey.creator.country.name || 'Desconocido';
        countryMap[countryName] = (countryMap[countryName] || 0) + (survey.response_count || 0);
      }
    });

    // ✅ FIX: Convertir a array y ordenar por respuestas (mayor a menor)
    const sortedCountries = Object.entries(countryMap)
      .map(([name, responses]) => ({ name, responses }))
      .sort((a, b) => b.responses - a.responses);

    // ✅ FIX: Top 5 países + agrupar el resto en "Otros"
    const top5 = sortedCountries.slice(0, 5);
    const others = sortedCountries.slice(5);
    
    // Si hay países adicionales, agruparlos en "Otros"
    if (others.length > 0) {
      const othersTotal = others.reduce((sum, country) => sum + country.responses, 0);
      top5.push({ name: 'Otros', responses: othersTotal });
    }

    return top5;
  }

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress sx={{ color: '#ffd700' }} size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: 'calc(100vh - 64px)',
      width: '100%',
      maxWidth: '100vw',
      bgcolor: '#0f0f0f',
      m: 0,
      p: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 215, 0, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.05) 0%, transparent 50%)',
    }}>
      <Container maxWidth={false} disableGutters sx={{ maxWidth: '100%', px: { xs: 1, sm: 2, md: 4 }, py: { xs: 2, sm: 3 }, height: '100%', boxSizing: 'border-box' }}>
        {/* Header VIP */}
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1.5} mb={1}>
            <Diamond sx={{ fontSize: 38, color: '#ffd700' }} />
            <Typography 
              variant="h2" 
              component="h1" 
              sx={{ 
                fontWeight: 900,
                fontSize: { xs: '1.3rem', sm: '2rem' },
                background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.3)',
              }}
            >
              Dashboard VIP
            </Typography>
            <Diamond sx={{ fontSize: 38, color: '#ffd700' }} />
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#ffffff',
              opacity: 0.8,
              fontSize: '1rem',
            }}
          >
            Experiencia Premium para {currentUser?.username}
          </Typography>
        </Box>

        {/* Tarjetas de Estadísticas VIP - Fila 1: 6 tarjetas */}
        <Grid container spacing={{ xs: 1, sm: 1.5 }} sx={{ mb: 2, justifyContent: 'center' }}>
          {/* Total Encuestas - VALOR ESTÁTICO */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #ffd700',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: { xs: '100%', sm: '320px' },
              margin: '0 auto',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 48px rgba(255, 215, 0, 0.5)',
              }
            }}>
              <CardContent sx={{ py: 1.2, px: { xs: 0.8, sm: 1.2 } }}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center">
                  <Assessment sx={{ fontSize: { xs: 22, sm: 28 }, color: '#ffd700', opacity: 0.6, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ffd700', fontSize: '1.4rem' }}>
                    {loading ? '...' : stats.totalSurveys}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.6rem' }}>
                    Total Encuestas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ✅ NUEVO: Encuestas Activas */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #4caf50',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: { xs: '100%', sm: '320px' },
              margin: '0 auto',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 48px rgba(76, 175, 80, 0.5)',
              }
            }}>
              <CardContent sx={{ py: 1.2, px: 1.2 }}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center">
                  <TrendingUp sx={{ fontSize: 28, color: '#4caf50', opacity: 0.6, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#4caf50', fontSize: '1.4rem' }}>
                    {loading ? '...' : stats.activeSurveys}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.6rem' }}>
                    Activas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ✅ NUEVO: Encuestas Eliminadas */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #f44336',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(244, 67, 54, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: { xs: '100%', sm: '320px' },
              margin: '0 auto',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 48px rgba(244, 67, 54, 0.5)',
              }
            }}>
              <CardContent sx={{ py: 1.2, px: 1.2 }}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center">
                  <Delete sx={{ fontSize: 28, color: '#f44336', opacity: 0.6, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#f44336', fontSize: '1.4rem' }}>
                    {loading ? '...' : stats.deletedSurveys}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.6rem' }}>
                    Eliminadas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Respuestas */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #ffed4e',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(255, 237, 78, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: { xs: '100%', sm: '320px' },
              margin: '0 auto',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 48px rgba(255, 237, 78, 0.5)',
              }
            }}>
              <CardContent sx={{ py: 1.2, px: 1.2 }}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center">
                  <People sx={{ fontSize: 28, color: '#ffed4e', opacity: 0.6, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ffed4e', fontSize: '1.4rem' }}>
                    {loading ? '...' : stats.totalResponses}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.6rem' }}>
                    Respuestas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Comentarios */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #ffc107',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(255, 193, 7, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: { xs: '100%', sm: '320px' },
              margin: '0 auto',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 48px rgba(255, 193, 7, 0.5)',
              }
            }}>
              <CardContent sx={{ py: 1.2, px: 1.2 }}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center">
                  <People sx={{ fontSize: 28, color: '#ffc107', opacity: 0.6, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ffc107', fontSize: '1.4rem' }}>
                    {loading ? '...' : stats.totalComments}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.6rem' }}>
                    Comentarios
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Karma VIP - Usuarios Únicos Ayudados */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #ff9800',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(255, 152, 0, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: { xs: '100%', sm: '320px' },
              margin: '0 auto',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 48px rgba(255, 152, 0, 0.5)',
              }
            }}>
              <CardContent sx={{ py: 1.2, px: 1.2 }}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center">
                  <Diamond sx={{ fontSize: 28, color: '#ff9800', opacity: 0.6, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ff9800', fontSize: '1.4rem' }}>
                    {loading ? '...' : stats.karma}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.6rem' }}>
                    Usuarios Ayudados
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ✅ FINAL: Sección de Visitas a Encuestas - Ancho Completo */}
        <Box sx={{ mb: 2 }}>
          <Paper sx={{ 
            p: 1.5,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            border: '2px solid #ffd700',
            boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffd700', mb: 1.5, textAlign: 'center', fontSize: '0.85rem' }}>
              📊 Visitas a Encuestas
            </Typography>
            <Grid container spacing={1.5}>
              {/* Hoy */}
              <Grid item xs={6} sm={3} md={3} sx={{ display: 'flex', flexGrow: 1 }}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
                  border: '1px solid #ffd700',
                  borderRadius: 2,
                  width: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 24px rgba(255, 215, 0, 0.4)',
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', py: 1, px: 0.7 }}>
                    <Today sx={{ fontSize: 20, color: '#ffd700', mb: 0.3 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffd700', mb: 0.3, fontSize: '1.5rem' }}>
                      {visitStats.today}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.55rem' }}>
                      Hoy
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Esta Semana */}
              <Grid item xs={6} sm={3} md={3} sx={{ display: 'flex', flexGrow: 1 }}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
                  border: '1px solid #ffed4e',
                  borderRadius: 2,
                  width: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 24px rgba(255, 237, 78, 0.4)',
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', py: 1, px: 0.7 }}>
                    <DateRange sx={{ fontSize: 20, color: '#ffed4e', mb: 0.3 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffed4e', mb: 0.3, fontSize: '1.5rem' }}>
                      {visitStats.thisWeek}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.55rem' }}>
                      Esta Semana
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Este Mes */}
              <Grid item xs={6} sm={3} md={3} sx={{ display: 'flex', flexGrow: 1 }}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
                  border: '1px solid #ffc107',
                  borderRadius: 2,
                  width: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 24px rgba(255, 193, 7, 0.4)',
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', py: 1, px: 0.7 }}>
                    <CalendarMonth sx={{ fontSize: 20, color: '#ffc107', mb: 0.3 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffc107', mb: 0.3, fontSize: '1.5rem' }}>
                      {visitStats.thisMonth}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.55rem' }}>
                      Este Mes
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Este Año */}
              <Grid item xs={6} sm={3} md={3} sx={{ display: 'flex', flexGrow: 1 }}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
                  border: '1px solid #ff9800',
                  borderRadius: 2,
                  width: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 24px rgba(255, 152, 0, 0.4)',
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', py: 1, px: 0.7 }}>
                    <CalendarToday sx={{ fontSize: 20, color: '#ff9800', mb: 0.3 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#ff9800', mb: 0.3, fontSize: '1.5rem' }}>
                      {visitStats.thisYear}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8, fontSize: '0.55rem' }}>
                      Este Año
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* ✅ OPTIMIZADO: Cronómetro de Sesión Persistente - Compacto */}
        <Paper sx={{ 
          p: 1.2,
          mb: 2,
          width: '100%',
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '2px solid #ffd700',
          boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
          textAlign: 'center',
        }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={0.5}>
            <AccessTime sx={{ fontSize: 22, color: '#ffd700' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffd700', fontSize: '0.8rem' }}>
              Tiempo en Cuestom
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#ffed4e', fontFamily: 'monospace', letterSpacing: 2, fontSize: '1.4rem' }}>
            {formatSessionTime(sessionTime)}
          </Typography>
          <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.7, mt: 0.3, fontSize: '0.55rem' }}>
            Tiempo de actividad hoy
          </Typography>
        </Paper>

        {/* ✅ OPTIMIZADO: Gráficos Compactos */}
        <Grid container spacing={2} sx={{ width: '100%' }}>
          {/* Actividad Semanal */}
          <Grid item xs={12} sx={{ width: '100%' }}>
            <Paper sx={{ 
              p: 1.5, 
              width: '100%',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #ffd700',
              boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
            }}>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <Timeline sx={{ fontSize: 22, color: '#ffd700' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffd700', fontSize: '0.9rem' }}>
                  📈 Actividad Semanal
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyActivity}>
                  <defs>
                    <linearGradient id="colorEncuestas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorParticipacion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="day" stroke="#ffffff" style={{ fontSize: '10px' }} />
                  <YAxis 
                    stroke="#ffffff" 
                    style={{ fontSize: '12px' }} 
                    allowDecimals={false}
                    domain={[0, (dataMax) => Math.max(10, dataMax)]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    label={{ value: 'Actividad', angle: -90, position: 'insideLeft', style: { fill: '#ffffff', fontSize: '12px', fontWeight: 600 } }} 
                  />
                  <Tooltip 
                    separator=": "
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '2px solid #00e5ff',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                    labelStyle={{ color: '#ffffff' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => {
                      const color = value === 'Encuestas' ? '#00e5ff' : '#ffffff';
                      return <span style={{ color: color, fontWeight: 'bold' }}>{value}</span>;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="encuestas" 
                    stroke="#00e5ff" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorEncuestas)" 
                    name="Encuestas"
                    dot={{ r: 4, fill: '#00e5ff' }}
                    label={({ value, x, y }) => {
                      if (value >= 10) {
                        return (
                          <text 
                            x={x} 
                            y={y - 10} 
                            fill="#00e5ff" 
                            textAnchor="middle" 
                            fontSize="11" 
                            fontWeight="bold"
                          >
                            10+
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="participacion" 
                    stroke="#ffffff" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorParticipacion)" 
                    name="Participación"
                    dot={{ r: 4, fill: '#ffffff' }}
                    label={({ value, x, y }) => {
                      if (value >= 10) {
                        return (
                          <text 
                            x={x} 
                            y={y - 10} 
                            fill="#ffffff" 
                            textAnchor="middle" 
                            fontSize="11" 
                            fontWeight="bold"
                          >
                            10+
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.7, mt: 1, display: 'block', textAlign: 'center', fontSize: '0.65rem' }}>
                Se reinicia cada semana
              </Typography>
            </Paper>
          </Grid>

          {/* Impacto Global */}
          <Grid item xs={12} sx={{ width: '100%' }}>
            <Paper sx={{ 
              p: 1.5, 
              width: '100%',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #ffd700',
              boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
            }}>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <Public sx={{ fontSize: 22, color: '#ffd700' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffd700', fontSize: '0.9rem' }}>
                  🌍 Impacto Global
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={countryStats} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#ffffff" style={{ fontSize: '12px' }} />
                  <YAxis 
                    stroke="#ffffff" 
                    style={{ fontSize: '12px' }} 
                    allowDecimals={false}
                    label={{ value: 'Impacto', angle: -90, position: 'insideLeft', style: { fill: '#ffd700', fontSize: '12px', fontWeight: 600 } }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '2px solid #ffd700',
                      borderRadius: '8px',
                      color: '#ffd700',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                    labelStyle={{ color: '#ffffff' }}
                    itemStyle={{ color: '#ffd700' }}
                  />
                  <Bar dataKey="responses" name="Respuestas" radius={[8, 8, 0, 0]}>
                    {countryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.7, mt: 1, display: 'block', textAlign: 'center', fontSize: '0.65rem' }}>
                Distribución por país
              </Typography>
            </Paper>
          </Grid>

          {/* Uso Semanal (Tiempo Conectado) */}
          <Grid item xs={12} sx={{ width: '100%' }}>
            <Paper sx={{ 
              p: 1.5, 
              width: '100%',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              border: '2px solid #4caf50',
              boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
            }}>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <AccessTime sx={{ fontSize: 22, color: '#4caf50' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50', fontSize: '0.9rem' }}>
                  ⏱️ Uso Semanal (Tiempo Conectado)
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="day" stroke="#ffffff" style={{ fontSize: '12px' }} />
                  <YAxis 
                    stroke="#ffffff" 
                    style={{ fontSize: '12px' }} 
                    allowDecimals={false}
                    domain={[0, 120]}
                    ticks={[0, 30, 60, 90, 120]}
                    label={{ value: 'Minutos', angle: -90, position: 'insideLeft', style: { fill: '#4caf50', fontSize: '12px', fontWeight: 600 } }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      color: '#4caf50',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                    labelStyle={{ color: '#ffffff' }}
                    itemStyle={{ color: '#4caf50' }}
                    formatter={(value, name) => {
                      if (name === 'minutos') {
                        const hours = Math.floor(value / 60);
                        const mins = value % 60;
                        return [`${hours}h ${mins}m`, 'Tiempo'];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar 
                    dataKey="minutos" 
                    name="Minutos Conectado" 
                    fill="#4caf50" 
                    radius={[8, 8, 0, 0]}
                    label={({ value, x, y, width }) => {
                      if (value >= 120) {
                        return (
                          <text 
                            x={x + width / 2} 
                            y={y - 5} 
                            fill="#4caf50" 
                            textAnchor="middle" 
                            fontSize="12" 
                            fontWeight="bold"
                          >
                            120+
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.7, mt: 1, display: 'block', textAlign: 'center', fontSize: '0.65rem' }}>
                Uso semanal de la plataforma
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Acciones VIP */}
        <Paper sx={{ 
          p: 2.5, 
          mt: 2, 
          width: '100%',
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '2px solid #ffd700',
          boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffd700', mb: 2, textAlign: 'center', fontSize: '1rem' }}>
            ⚡ Acciones VIP Exclusivas
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} sm={3}>
              <Box
                component={Link}
                to="/create"
                sx={{
                  display: 'block',
                  p: 3,
                  textAlign: 'center',
                  background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                  borderRadius: 3,
                  textDecoration: 'none',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  boxShadow: '0 8px 24px rgba(255, 215, 0, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px) scale(1.05)',
                    boxShadow: '0 12px 32px rgba(255, 215, 0, 0.6)',
                  }
                }}
              >
                <Create sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">Crear Encuesta Premium</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box
                component={Link}
                to="/encuestas"
                sx={{
                  display: 'block',
                  p: 3,
                  textAlign: 'center',
                  background: 'linear-gradient(45deg, #ffed4e, #ffc107)',
                  borderRadius: 3,
                  textDecoration: 'none',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  boxShadow: '0 8px 24px rgba(255, 237, 78, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px) scale(1.05)',
                    boxShadow: '0 12px 32px rgba(255, 237, 78, 0.6)',
                  }
                }}
              >
                <Assessment sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">Explorar Encuestas</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box
                component={Link}
                to="/profile"
                sx={{
                  display: 'block',
                  p: 3,
                  textAlign: 'center',
                  background: 'linear-gradient(45deg, #ffc107, #ff9800)',
                  borderRadius: 3,
                  textDecoration: 'none',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  boxShadow: '0 8px 24px rgba(255, 193, 7, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px) scale(1.05)',
                    boxShadow: '0 12px 32px rgba(255, 193, 7, 0.6)',
                  }
                }}
              >
                <Diamond sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">Mi Perfil VIP</Typography>
              </Box>
            </Grid>
            {/* ✅ NUEVO: Botón Mejorar Suscripción */}
            <Grid item xs={12} sm={3}>
              <Box
                component={Link}
                to="/upgrade"
                sx={{
                  display: 'block',
                  p: 3,
                  textAlign: 'center',
                  background: 'linear-gradient(45deg, #ff9800, #ff5722)',
                  borderRadius: 3,
                  textDecoration: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  boxShadow: '0 8px 24px rgba(255, 152, 0, 0.4)',
                  transition: 'all 0.3s ease',
                  border: '2px solid #ffd700',
                  '&:hover': {
                    transform: 'translateY(-4px) scale(1.05)',
                    boxShadow: '0 12px 32px rgba(255, 152, 0, 0.6)',
                  }
                }}
              >
                <Star sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">Mejorar Suscripción</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default VipDashboard;
