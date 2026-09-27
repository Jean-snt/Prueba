import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  IconButton,
} from '@mui/material';
import {
  Assessment,
  Visibility,
  Person,
  Flag,
  Close,
  Delete,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import CommentsSection from './CommentsSection';
import ReportDialog from './ReportDialog';
import { useNavigate } from 'react-router-dom';

const SurveyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();  // ✅ FIX 3: Detectar cambios de ruta
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportDialog, setReportDialog] = useState(false);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  
  // ✅ NUEVO: Estados para likes/dislikes
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userLike, setUserLike] = useState(null);
  
  // ✅ SEGURIDAD VIP: Obtener usuario y verificar estado actualizado
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // ✅ PROTECCIÓN DE PRIVACIDAD: Redirigir a login si no está autenticado
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // ✅ SINCRONIZACIÓN EN CALIENTE: Escuchar cambios de estado VIP
  useEffect(() => {
    const handleVipStatusChange = (event) => {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    };

    window.addEventListener('vipStatusChanged', handleVipStatusChange);
    
    return () => {
      window.removeEventListener('vipStatusChanged', handleVipStatusChange);
    };
  }, []);

  const fetchSurveyDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await surveyAPI.getSurvey(id);
      setSurvey(response.data.survey);
      
      // ✅ NUEVO: Inicializar likes/dislikes
      setLikes(response.data.survey.likes_count || 0);
      setDislikes(response.data.survey.dislikes_count || 0);
      setUserLike(
        response.data.survey.user_liked ? 'like' : 
        (response.data.survey.user_disliked ? 'dislike' : null)
      );
    } catch (err) {
      setError('Error al cargar los detalles de la encuesta');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ✅ Cargar encuesta al montar y cuando cambia el ID
  useEffect(() => {
    fetchSurveyDetails();
  }, [fetchSurveyDetails]);

  // ✅ Recargar cuando cambia la ruta
  useEffect(() => {
    fetchSurveyDetails();
  }, [location.key, fetchSurveyDetails]);

  // ✅ NUEVO: Función para manejar likes/dislikes
  const handleLike = async (type) => {
    if (!currentUser) {
      alert('Debes iniciar sesión para votar');
      return;
    }
    
    try {
      // Si ya tiene el mismo voto, lo quita (toggle)
      if (userLike === type) {
        const response = await surveyAPI.likeSurvey(survey.id, 'remove');
        
        if (response.data.success) {
          setLikes(response.data.likes_count);
          setDislikes(response.data.dislikes_count);
          setUserLike(null);
        }
      } else {
        // Cambiar o agregar voto
        const response = await surveyAPI.likeSurvey(survey.id, type);
        
        if (response.data.success) {
          setLikes(response.data.likes_count);
          setDislikes(response.data.dislikes_count);
          setUserLike(response.data.user_liked ? 'like' : (response.data.user_disliked ? 'dislike' : null));
        }
      }
    } catch (error) {
      console.error('Error al votar:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCreatorDisplayName = (creator) => {
    if (!creator) return 'Anónimo';
    return creator.display_name || creator.username || 'Anónimo';
  };

  const getCreatorGender = (creator) => {
    if (!creator) return null;
    if (survey?.creator_gender) {
      const genderMap = {
        'M': 'Masculino',
        'F': 'Femenino', 
        'A': 'Anónimo',
        'O': 'Otro',
        'N': 'Prefiere no decir'
      };
      return genderMap[survey.creator_gender] || survey.creator_gender;
    }
    return null;
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
      width: '100%',
      maxWidth: '1600px',
      minHeight: '80vh',
      mx: 'auto',
      display: 'flex',
      flexDirection: 'column',
      px: { xs: 2, md: 4 },
      py: 3,
      backgroundColor: '#7113B8',
      '& > *': {
        width: '100%'
      }
    }}>
      {/* ✅ ZOOM REAL: Imagen con Backdrop de pantalla completa */}
      {survey.image_url && (
        <Box 
          onClick={() => setImageZoomOpen(true)}
          sx={{ 
            mb: 3, 
            width: '100%',
            maxHeight: '400px',
            overflow: 'hidden',
            borderRadius: '8px',
            cursor: 'zoom-in',
            position: 'relative',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.02)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              '&::before': {
                content: '"🔍 Click para ampliar"',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 700,
                zIndex: 10,
                pointerEvents: 'none',
              }
            }
          }}
        >
          <img
            src={`http://localhost:8000${survey.image_url}`}
            alt={survey.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
        </Box>
      )}
      
      <Card sx={{ mb: 3, width: '100%', minHeight: '300px', backgroundColor: '#ffffff !important' }}>
        <CardContent sx={{ p: { xs: 2, md: 4 }, color: '#000000 !important', minHeight: '250px' }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Assessment sx={{ fontSize: { xs: 28, md: 40 }, color: 'primary.main', mr: 2 }} />
            <Box flexGrow={1}>
              <Typography 
                variant="h3" 
                component="h1" 
                sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  lineHeight: 1.2,
                  mb: 2,
                  color: '#000000',  /* ✅ FIX: Texto negro */
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                {survey.title}
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mt={1} flexWrap="wrap">
                <Chip 
                  label={survey.is_active ? 'Activa' : 'Inactiva'} 
                  color={survey.is_active ? 'success' : 'default'}
                  size="small"
                />
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {getCreatorDisplayName(survey.creator)}
                  </Typography>
                </Box>
                {/* ✅ NUEVO: Género del autor */}
                {getCreatorGender(survey.creator) && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Género: {getCreatorGender(survey.creator)}
                    </Typography>
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary">
                  Creada el {formatDate(survey.created_at)}
                </Typography>
                {survey.response_count > 0 && (
                  <Chip 
                    label={`${survey.response_count} respuesta${survey.response_count !== 1 ? 's' : ''}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
            </Box>
          </Box>
          
          {survey.description && (
            <Box sx={{ 
              mb: 3,
              p: { xs: 2, md: 3 },
              bgcolor: '#f5f5f5',  /* ✅ FIX: Fondo gris claro */
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.300'
            }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1.1rem' },
                  color: '#000000',  /* ✅ FIX: Texto negro */
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxWidth: 'none',
                }}
              >
                {survey.description}
              </Typography>
            </Box>
          )}
          
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            {/* ✅ NUEVO: Sistema de Like/Dislike */}
            {currentUser && (
              <Box display="flex" alignItems="center" gap={1} sx={{ mr: 2 }}>
                <IconButton
                  size="medium"
                  onClick={() => handleLike('like')}
                  sx={{
                    color: userLike === 'like' ? '#4caf50' : '#808080',
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    }
                  }}
                >
                  <ThumbUp />
                </IconButton>
                <Typography variant="body1" color="text.secondary" sx={{ minWidth: '30px', fontWeight: 600 }}>
                  {likes}
                </Typography>
                
                <IconButton
                  size="medium"
                  onClick={() => handleLike('dislike')}
                  sx={{
                    color: userLike === 'dislike' ? '#f44336' : '#808080',
                    '&:hover': {
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    }
                  }}
                >
                  <ThumbDown />
                </IconButton>
                <Typography variant="body1" color="text.secondary" sx={{ minWidth: '30px', fontWeight: 600 }}>
                  {dislikes}
                </Typography>
              </Box>
            )}
            
            {/* ✅ RESTRICCIÓN VIP: Solo usuarios VIP pueden ver resultados */}
            {(() => {
              // ✅ SEGURIDAD: Verificación estricta del estado VIP
              const isVip = currentUser && currentUser.is_vip === true;
              
              return (
                <>
                  {isVip && (
                    <Button
                      component={Link}
                      to={`/encuestas/${survey.id}/results`}
                      variant="contained"
                      startIcon={<Visibility />}
                      size="large"
                      sx={{
                        backgroundColor: '#8C4EFF',
                        color: '#ffffff',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: '#5568d3',
                        }
                      }}
                    >
                      Ver Resultados
                    </Button>
                  )}
                  {survey.is_owner ? (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={async () => {
                        if (window.confirm('¿Estás seguro de que quieres eliminar esta encuesta? Esta acción no se puede deshacer.')) {
                          try {
                            await surveyAPI.deleteSurvey(survey.id);
                            navigate('/encuestas');
                          } catch (err) {
                            alert('Error al eliminar la encuesta');
                          }
                        }
                      }}
                      size="large"
                    >
                      Eliminar
                    </Button>
                  ) : currentUser && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Flag />}
                      onClick={() => setReportDialog(true)}
                      size="large"
                      sx={{
                        ml: 2,
                        borderColor: '#d32f2f',
                        color: '#d32f2f',
                        '&:hover': {
                          borderColor: '#b71c1c',
                          backgroundColor: 'rgba(211, 47, 47, 0.04)',
                        }
                      }}
                    >
                      Reportar
                    </Button>
                  )}
                </>
              );
            })()}
          </Box>
        </CardContent>
      </Card>

      {/* ✅ SOLO COMENTARIOS - Tabs eliminadas */}
      <Card sx={{ width: '100%', backgroundColor: '#ffffff !important' }}>
        <CardContent sx={{ p: { xs: 2, md: 4 }, color: '#000000 !important' }}>
          <CommentsSection 
            surveyId={parseInt(id)} 
            currentUser={currentUser}
          />
        </CardContent>
      </Card>
      
      {/* Report Dialog */}
      <ReportDialog
        open={reportDialog}
        onClose={() => setReportDialog(false)}
        contentType="survey"
        contentId={survey?.id}
        contentTitle={survey?.title}
      />

      {/* ✅ ZOOM LOCALIZADO: Modal con magnifier effect */}
      <Dialog
        open={imageZoomOpen}
        onClose={() => setImageZoomOpen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0,0,0,0.95)',
            boxShadow: 'none',
            maxWidth: '100vw',
            maxHeight: '100vh',
            margin: 0,
            overflow: 'hidden',
          }
        }}
      >
        <IconButton
          onClick={() => setImageZoomOpen(false)}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: 'white',
            backgroundColor: '#000000',
            zIndex: 1500,
          }}
        >
          <Close sx={{ fontSize: 32 }} />
        </IconButton>
        {survey?.image_url && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100vh',
              p: 0,
              overflow: 'hidden',
              cursor: 'zoom-out',
            }}
            onClick={() => setImageZoomOpen(false)}
          >
            <img
              src={`http://localhost:8000${survey.image_url}`}
              alt={survey.title}
              onClick={(e) => {
                e.stopPropagation();
                const img = e.currentTarget;
                const rect = img.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                // ✅ FIX 3: ZOOM SEGURIDAD 70vh - Toggle entre 1.2x y 2x
                if (img.style.transform === 'scale(2)') {
                  img.style.transform = 'scale(1.2)';
                  img.style.transformOrigin = 'center center';
                  img.style.cursor = 'zoom-in';
                } else {
                  img.style.transform = 'scale(2)';
                  img.style.transformOrigin = `${x}% ${y}%`;
                  img.style.cursor = 'zoom-out';
                }
              }}
              style={{
                maxHeight: '70vh',
                maxWidth: '95vw',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '8px',
                cursor: 'zoom-in',
                transform: 'scale(1.2)',
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease',
              }}
            />
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default SurveyDetail;

