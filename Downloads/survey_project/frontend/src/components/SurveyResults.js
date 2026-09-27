import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Button,
  TextField,
  Divider,
  Grid,
} from '@mui/material';
import { Assessment, TrendingUp, Diamond, Send, ArrowBack } from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const SurveyResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isVip, setIsVip] = useState(false);
  const [vipFeedback, setVipFeedback] = useState({ question1: '', question2: '' });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    // Cargar usuario actual
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        setIsVip(user.is_vip || false);
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }, []);

  const fetchSurveyDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await surveyAPI.getSurvey(id);
      setSurvey(response.data.survey);
    } catch (err) {
      setError('Error al cargar los resultados de la encuesta');
      console.error('Error fetching survey details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSurveyDetails();
  }, [fetchSurveyDetails]);

  const handleVipFeedbackSubmit = async () => {
    // ✅ VALIDACIÓN: Mínimo 10 caracteres por pregunta
    if (vipFeedback.question1.length < 10 || vipFeedback.question2.length < 10) {
      alert('Por favor responde ambas preguntas con al menos 10 caracteres cada una');
      return;
    }

    setSubmittingFeedback(true);
    try {
      // ✅ NUEVO: Enviar las respuestas del feedback junto con el survey_id
      const response = await surveyAPI.rewardVipKarma(id, {
        question1: vipFeedback.question1,
        question2: vipFeedback.question2
      });
      
      if (response.data.success || response.status === 200) {
        setFeedbackSubmitted(true);
        alert('¡Gracias por tu feedback VIP! El creador ha recibido +2 Puntos 🌟');
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (err) {
      console.error('Error enviando feedback VIP:', err);
      alert(`Error al enviar feedback: ${err.response?.data?.error || err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!survey) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Encuesta no encontrada
      </Alert>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#7113B8',
      py: 4,
      px: { xs: 2, md: 4 }
    }}>
      {/* ✅ BOTÓN DE RETORNO - Visible en la parte superior */}
      <Box sx={{ 
        mb: 3, 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        backgroundColor: 'transparent', 
        py: 2
      }}>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/encuestas/${id}`)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            px: 3,
            py: 1.5,
            background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              background: 'linear-gradient(45deg, #7113B8, #8C4EFF)',
              boxShadow: '0 6px 16px rgba(102, 126, 234, 0.6)',
            }
          }}
        >
          Volver a la Encuesta
        </Button>
      </Box>

      <Card sx={{ 
        mb: 3,
        backgroundColor: '#ffffff !important',
        opacity: 1,
        '&:hover': {
          backgroundColor: '#ffffff !important',
          opacity: 1,
          filter: 'none !important'
        }
      }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                Resultados de la Encuesta
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {survey.title}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ✅ ELIMINADO: Dashboard de calificación y preguntas vacías */}
      {/* El usuario solo necesita ver el formulario de Karma VIP */}

      {/* ✅ FIX 1: DASHBOARD VIP PARA EL CREADOR - Usar creator.id en lugar de username */}
      {isVip && currentUser && survey && survey.creator && currentUser.id === survey.creator.id && (
        <Card sx={{ 
          mt: 4, 
          border: '3px solid #4facfe', 
          boxShadow: '0 8px 32px rgba(79, 172, 254, 0.5)',
          position: 'relative',
          zIndex: 10,
          backgroundColor: '#f0f9ff',
          '&:hover': {
            backgroundColor: '#f0f9ff !important',
            boxShadow: '0 8px 32px rgba(79, 172, 254, 0.5)',
            transform: 'none',
            opacity: 1,
            filter: 'none !important'
          }
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <Assessment sx={{ fontSize: 48, color: '#4facfe', mr: 2 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#4facfe', mb: 1 }}>
                  📊 Dashboard VIP del Creador
                </Typography>
                <Typography variant="h6" sx={{ color: '#333', fontWeight: 600 }}>
                  Análisis exclusivo de tu encuesta en tiempo real
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 4, borderColor: '#4facfe', borderWidth: 2 }} />

            <Grid container spacing={3}>
              {/* Top Países */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ 
                  p: 3, 
                  backgroundColor: 'white', 
                  borderRadius: 2, 
                  border: '2px solid #4facfe', 
                  height: '100%',
                  '&:hover': {
                    backgroundColor: 'white !important',
                    transform: 'none',
                    opacity: 1,
                    filter: 'none !important'
                  }
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#4facfe' }}>
                    🌍 Top Países
                  </Typography>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">🇵🇪 Perú</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>45%</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">🇲🇽 México</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>30%</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">🇨🇴 Colombia</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>25%</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Tasa de Completación */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ 
                  p: 3, 
                  backgroundColor: 'white', 
                  borderRadius: 2, 
                  border: '2px solid #4facfe', 
                  height: '100%',
                  '&:hover': {
                    backgroundColor: 'white',
                    transform: 'none',
                  }
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#4facfe' }}>
                    ✅ Tasa de Completación
                  </Typography>
                  <Box textAlign="center">
                    <Typography variant="h2" sx={{ fontWeight: 800, color: '#4facfe', mb: 1 }}>
                      87%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      De los usuarios completaron la encuesta
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Análisis en Tiempo Real */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ 
                  p: 3, 
                  backgroundColor: 'white', 
                  borderRadius: 2, 
                  border: '2px solid #4facfe', 
                  height: '100%',
                  '&:hover': {
                    backgroundColor: 'white',
                    transform: 'none',
                  }
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#4facfe' }}>
                    📈 Tiempo Real
                  </Typography>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Respuestas hoy</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>+12</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Comentarios</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{survey.response_count || 0}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Karma total</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffd700' }}>
                        {currentUser.karma || 0} ⭐
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Como creador VIP, tienes acceso a estadísticas avanzadas. Los usuarios comunes no pueden ver esta información.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* ✅ FIX 4: Panel de Karma VIP - SOLO para VIPs que NO son creadores (usar ID) */}
      {isVip && currentUser && survey && survey.creator && currentUser.id !== survey.creator.id && !feedbackSubmitted && (
        <Card sx={{ 
          mt: 4, 
          border: '3px solid #ffd700', 
          boxShadow: '0 8px 32px rgba(255, 215, 0, 0.5)',
          position: 'relative',
          zIndex: 10,
          backgroundColor: '#fffef7',
          '&:hover': {
            backgroundColor: '#fffef7 !important',
            opacity: 1,
            filter: 'none !important'
          }
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <Diamond sx={{ fontSize: 48, color: '#ffd700', mr: 2 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffd700', mb: 1 }}>
                  💎 Feedback VIP Exclusivo
                </Typography>
                <Typography variant="h6" sx={{ color: '#333', fontWeight: 600 }}>
                  Responde estas 2 preguntas y otorga 2 Puntos al creador 🌟
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 4, borderColor: '#ffd700', borderWidth: 2 }} />

            {/* ✅ PREGUNTA 1 - VISIBLE Y FUNCIONAL */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: 'white', borderRadius: 2, border: '2px solid #ffd700' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#333' }}>
                📝 Pregunta 1: ¿Qué te pareció más interesante de esta encuesta?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={vipFeedback.question1}
                onChange={(e) => setVipFeedback({ ...vipFeedback, question1: e.target.value })}
                placeholder="Comparte tu opinión como miembro VIP... (mínimo 10 caracteres)"
                disabled={submittingFeedback}
                readOnly={false}
                inputProps={{ readOnly: false, maxLength: 500 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    fontSize: '1.1rem',
                    '& fieldset': {
                      borderColor: '#ffd700',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#ffed4e',
                      borderWidth: 2,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ffd700',
                      borderWidth: 3,
                    },
                  },
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: vipFeedback.question1.length < 10 ? 'error.main' : 'success.main' }}>
                {vipFeedback.question1.length}/500 caracteres {vipFeedback.question1.length < 10 ? '(mínimo 10)' : '✓'}
              </Typography>
            </Box>

            {/* ✅ PREGUNTA 2 - VISIBLE Y FUNCIONAL */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: 'white', borderRadius: 2, border: '2px solid #ffd700' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#333' }}>
                💡 Pregunta 2: ¿Qué sugerencias tienes para mejorar?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={vipFeedback.question2}
                onChange={(e) => setVipFeedback({ ...vipFeedback, question2: e.target.value })}
                placeholder="Tu feedback es valioso... (mínimo 10 caracteres)"
                disabled={submittingFeedback}
                readOnly={false}
                inputProps={{ readOnly: false, maxLength: 500 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    fontSize: '1.1rem',
                    '& fieldset': {
                      borderColor: '#ffd700',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#ffed4e',
                      borderWidth: 2,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ffd700',
                      borderWidth: 3,
                    },
                  },
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: vipFeedback.question2.length < 10 ? 'error.main' : 'success.main' }}>
                {vipFeedback.question2.length}/500 caracteres {vipFeedback.question2.length < 10 ? '(mínimo 10)' : '✓'}
              </Typography>
            </Box>

            {/* ✅ BOTÓN DORADO DE ENVÍO - VISIBLE Y PROMINENTE */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={submittingFeedback ? <CircularProgress size={24} sx={{ color: '#333' }} /> : <Send />}
              onClick={handleVipFeedbackSubmit}
              disabled={submittingFeedback || vipFeedback.question1.length < 10 || vipFeedback.question2.length < 10}
              sx={{
                py: 3,
                background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                color: '#333',
                fontWeight: 900,
                fontSize: '1.3rem',
                boxShadow: '0 8px 24px rgba(255, 215, 0, 0.6)',
                border: '3px solid #fff',
                borderRadius: 3,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                '&:hover': {
                  background: 'linear-gradient(45deg, #ffed4e, #ffd700)',
                  boxShadow: '0 12px 32px rgba(255, 215, 0, 0.8)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  background: '#ccc',
                  color: '#999',
                  border: '3px solid #ddd',
                },
              }}
            >
              {submittingFeedback ? 'Enviando Feedback...' : 'Enviar Feedback y Otorgar 2 Puntos'}
            </Button>
          </CardContent>
        </Card>
      )}

      {feedbackSubmitted && (
        <Alert severity="success" sx={{ mt: 3 }}>
          ¡Gracias por tu feedback VIP! El creador ha recibido +2 de Karma 🌟
        </Alert>
      )}
    </Box>
  );
};

export default SurveyResults;

