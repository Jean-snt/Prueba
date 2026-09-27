import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  CardHeader,
  Divider,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { 
  Assessment, 
  Person,
  Schedule,
  Flag,
  TrendingUp,
  MoreVert,
  ThumbUp,
  ThumbDown,
  Comment,
  Diamond,
  Male,
  Female,
  PersonOutline,
  Delete,
  AccessTime,
} from '@mui/icons-material';
import ReportDialog from './ReportDialog';
import LoginRequiredModal from './LoginRequiredModal'; // ✅ NUEVO
import { surveyAPI } from '../services/api';

// CRÍTICO: Mapa de colores constante - única fuente de verdad
const genderColorMap = {
  'M': '#2196F3',  /* ✅ FIX: Azul vibrante para masculino */
  'F': '#E91E63',  /* ✅ FIX: Rosa fucsia equilibrado para femenino */
  'A': '#757575',  /* ✅ FIX: Gris acero para anónimo */
};

const SurveyCard = ({ survey, currentUser, onReport, onDelete }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [reportDialog, setReportDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [loginRequiredModal, setLoginRequiredModal] = useState(false);
  const [likes, setLikes] = useState(survey.likes_count || 0);
  const [dislikes, setDislikes] = useState(survey.dislikes_count || 0);
  // ✅ FIX: Backend usa user_liked/user_disliked, no user_like
  const [userLike, setUserLike] = useState(
    survey.user_liked ? 'like' : (survey.user_disliked ? 'dislike' : null)
  );
  const [deleting, setDeleting] = useState(false);
  const [reportedSurveys, setReportedSurveys] = useState(() => {
    const stored = localStorage.getItem('reportedSurveys');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // ✅ useEffect para sincronizar cuando survey cambia
  React.useEffect(() => {
    setUserLike(survey.user_liked ? 'like' : (survey.user_disliked ? 'dislike' : null));
  }, [survey.user_liked, survey.user_disliked, survey.id, survey.expires_at]);

  // CRÍTICO: Aislamiento total - cada tarjeta calcula su propio color
  // Usar survey.creator_gender (almacenado en momento de creación)
  const creatorGender = survey.creator_gender || 'A';
  const bgColor = genderColorMap[creatorGender] || '#757575';  /* ✅ FIX: Fallback a gris acero */
  const creatorProfileImage = survey.creator?.profile_image || null;
  
  // ✅ Determinar color de texto según el fondo
  const textColor = '#ffffff';  /* ✅ FIX: Texto blanco para todos los fondos oscuros */
  
  // ✅ Verificar si el creador es VIP - Múltiples rutas de datos
  const isCreatorVip = survey.creator?.is_vip || 
                       survey.creator?.profile?.is_vip || 
                       survey.is_vip || 
                       false;

  // ✅ NUEVO: Borde dorado para VIP, blanco para usuarios normales
  const hoverBorderColor = isCreatorVip ? '#FFD700' : '#ffffff';

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCreatorDisplayName = (creator) => {
    if (!creator) return 'Anónimo';
    
    // ✅ CRÍTICO: Verificar si la encuesta es anónima (creator_identity)
    // Si survey.creator_identity existe y showRealName es false, mostrar anónimo
    const isAnonymous = survey.creator_identity && !survey.creator_identity.showRealName;
    
    if (isAnonymous) {
      // ✅ PRIVACIDAD: Si es anónimo, solo mostrar "Anónimo" sin edad
      return 'Anónimo';
    }
    
    // ✅ CRÍTICO: Priorizar display_name para respetar anonimato
    let name = creator.display_name || creator.username || 'Anónimo';
    
    // Agregar edad si está disponible y NO es anónimo
    if (creator.age && !isAnonymous) {
      name += ` (${creator.age} años)`;
    }
    
    return name;
  };

  const getCountryFlag = (country) => {
    if (!country || !country.code) return null;
    // Usando la API de flagcdn para obtener banderas
    return `https://flagcdn.com/24x18/${country.code.toLowerCase()}.png`;
  };

  const handleMenuOpen = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleReport = () => {
    // ✅ VALIDACIÓN: Verificar si ya reportó esta encuesta
    if (reportedSurveys.has(survey.id)) {
      alert('Ya has reportado este contenido');
      return;
    }
    
    // ✅ Verificar autenticación
    if (!currentUser) {
      alert('Debes iniciar sesión para reportar contenido');
      return;
    }
    
    setReportDialog(true);
    setMenuAnchor(null);
  };
  
  // ✅ NUEVO: Función para manejar el cierre del modal de reporte
  const handleReportDialogClose = (success = false) => {
    // ✅ CRÍTICO: Solo marcar como reportado si el reporte fue exitoso
    if (success) {
      const newReported = new Set([...reportedSurveys, survey.id]);
      setReportedSurveys(newReported);
      localStorage.setItem('reportedSurveys', JSON.stringify([...newReported]));
      if (onReport) onReport();
    }
    
    setReportDialog(false);
  };

  const handleDeleteSurvey = async () => {
    setDeleting(true);
    
    try {
      const response = await surveyAPI.deleteSurvey(survey.id);
      setDeleteDialog(false);
      
      if (onDelete) {
        onDelete(survey.id, response.data.message);
      }
      
    } catch (error) {
      alert('Error al eliminar la encuesta. Inténtalo de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  const handleLike = async (event, type) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentUser) {
      setLoginRequiredModal(true);
      return;
    }
    
    try {
      // ✅ FIX: Si ya tiene el mismo tipo de like, lo quita (toggle)
      if (userLike === type) {
        // Quitar el voto
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
      
      // ✅ NUEVO: Notificar al componente padre para actualizar rankings
      if (window.refreshRankings) {
        window.refreshRankings();
      }
      
    } catch (error) {
      console.error('Error al votar:', error);
    }
  };

  const canReport = currentUser && survey.creator && !survey.is_owner;
  const canDelete = survey.is_owner;

  return (
    <>
      <Card 
        component={Link}
        to={`/encuestas/${survey.id}`}
        sx={{ 
          height: '450px',
          width: '100%',
          minWidth: '100%',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease-in-out',
          borderRadius: '16px',
          backgroundColor: bgColor,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '2px solid transparent',
          textDecoration: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          marginTop: '24px',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: isCreatorVip 
              ? '0 8px 25px rgba(255, 215, 0, 0.4)' 
              : '0 8px 25px rgba(0,0,0,0.15)',
            border: `2px solid ${hoverBorderColor}`,
            backgroundColor: bgColor,  // ✅ CRÍTICO: Mantener color de género
            textDecoration: 'none',
            color: '#ffffff',  // ✅ CRÍTICO: Mantener texto blanco
          }
        }}
      >
        <CardHeader
          avatar={
            creatorProfileImage ? (
              <Avatar
                src={creatorProfileImage}
                sx={{ width: 48, height: 48 }}
              />
            ) : (
              <Avatar 
                className="creator-avatar"
                sx={{ 
                  bgcolor: '#ffffff',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {creatorGender === 'M' && <Person sx={{ fontSize: 32, color: '#2196F3' }} />}
                {creatorGender === 'F' && <Person sx={{ fontSize: 32, color: '#E91E63' }} />}
                {creatorGender === 'A' && <PersonOutline sx={{ fontSize: 32, color: '#757575' }} />}
              </Avatar>
            )
          }
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography 
                variant="h6" 
                component="h2" 
                sx={{ 
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  lineHeight: 1.3,
                  color: textColor,  /* ✅ FIX: Texto blanco en fondo de género oscuro */
                  fontFamily: 'Inter, Roboto, sans-serif',
                }}
              >
                {survey.title}
              </Typography>
              {/* ✅ FOMO: Icono de reloj para encuestas temporales */}
              {(survey.expires_at && survey.expires_at !== null && survey.expires_at !== "") && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <AccessTime 
                    sx={{ 
                      fontSize: 20, 
                      color: '#ff9800',
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                      }
                    }} 
                    titleAccess="Encuesta temporal - Se auto-destruirá"
                  />
                  <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>
                    TEMPORAL
                  </Typography>
                </Box>
              )}
            </Box>
          }
          subheader={
            <Box sx={{ mt: 1 }}>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                {/* ✅ RESTAURADO: Icono de género con color BLANCO para contraste */}
                {creatorGender === 'M' && <Male sx={{ fontSize: 18, color: '#ffffff !important' }} />}
                {creatorGender === 'F' && <Female sx={{ fontSize: 18, color: '#ffffff !important' }} />}
                {creatorGender === 'A' && <PersonOutline sx={{ fontSize: 18, color: '#ffffff !important' }} />}
                <Typography 
                  variant="body2" 
                  sx={{
                    color: isCreatorVip ? '#FFD700' : textColor,
                    fontWeight: isCreatorVip ? 700 : 400,
                  }}
                >
                  {getCreatorDisplayName(survey.creator)}
                </Typography>
                {/* ✅ RESTAURADO: Diamante VIP DORADO para lista de encuestas */}
                {isCreatorVip && (
                  <Diamond sx={{ 
                    fontSize: 14, 
                    color: '#FFD700',
                    ml: 0.5
                  }} 
                  titleAccess="Usuario VIP"
                  />
                )}
                {/* Mostrar bandera del país si está disponible */}
                {survey.creator?.country && (
                  <Box display="flex" alignItems="center" gap={0.5} ml={1}>
                    <img
                      src={getCountryFlag(survey.creator.country)}
                      alt={survey.creator.country.name}
                      style={{ 
                        borderRadius: 2,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }}
                      title={survey.creator.country.name}
                    />
                  </Box>
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Schedule sx={{ fontSize: 16, color: textColor }} />  {/* ✅ FIX: Icono blanco */}
                <Typography variant="caption" sx={{ color: textColor }}>  {/* ✅ FIX: Texto blanco */}
                  {formatDate(survey.created_at)}
                </Typography>
              </Box>
            </Box>
          }
          action={
            <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={survey.is_active ? 'Activa' : 'Inactiva'} 
                  color={survey.is_active ? 'success' : 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                {(canReport || canDelete) && ( // ✅ MODIFICADO: Mostrar menú si puede reportar O eliminar
                  <IconButton
                    size="small"
                    onClick={handleMenuOpen}
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: 'rgba(0,0,0,0.04)' 
                      } 
                    }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                )}
              </Box>
              {survey.response_count > 0 && (
                <Badge 
                  badgeContent={survey.response_count} 
                  color="primary"
                  className="response-badge"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }
                  }}
                >
                  <TrendingUp sx={{ fontSize: 20, color: 'primary.main' }} />
                </Badge>
              )}
            </Box>
          }
          sx={{ pb: 1 }}
        />
        
        <Divider />
        
        <CardContent 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            margin: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          sx={{ 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pt: 4,
            pb: 4,
            px: 4
          }}
        >
          {/* NSFW - Chip sin animaciones */}
          {survey.is_nsfw && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label="NSFW"
                size="small"
                sx={{
                  backgroundColor: '#fff3e0 !important',
                  color: '#e65100 !important',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: '22px',
                  opacity: 1,
                  transition: 'none'
                }}
              />
            </Box>
          )}
          
          {/* ✅ NUEVO: Contenedor superior para descripción */}
          <Box sx={{ flexGrow: 1, mb: 2 }}>
            <Typography 
              variant="body1" // ✅ CAMBIADO: De body2 a body1 para texto más grande
              color="text.primary" // ← CRÍTICO: Texto oscuro para contraste
              sx={{ 
                mb: 4, // ✅ AUMENTADO: Más margen inferior (de 3 a 4)
                minHeight: '100px', // ✅ AUMENTADO: Más altura mínima (de 80px a 100px)
                lineHeight: 1.7, // ✅ AUMENTADO: Mejor espaciado entre líneas (de 1.6 a 1.7)
                display: '-webkit-box',
                WebkitLineClamp: 5, // ✅ AUMENTADO: Más líneas visibles (de 4 a 5)
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontWeight: 500, // ← Texto más legible
                fontSize: '1.1rem', // ✅ AUMENTADO: Tamaño de fuente más grande (de 1rem a 1.1rem)
                wordBreak: 'break-word', // ✅ NUEVO: Evitar que texto largo estire el panel
                overflowWrap: 'break-word' // ✅ NUEVO: Saltar de línea en palabras largas
              }}
            >
              {survey.description || 'Sin descripción disponible'}
            </Typography>
            
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}> {/* ✅ AUMENTADO: Más margen inferior (de 2 a 3) */}
              <Box display="flex" alignItems="center" gap={1}>
                <Assessment 
                  className="stats-icon-fixed"
                  sx={{ fontSize: 20, color: '#1976d2' }} 
                />
                {!survey.is_nsfw && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                    Encuesta interactiva
                  </Typography>
                )}
              </Box>
              {survey.response_count > 0 && (
                <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ fontSize: '0.9rem' }}> {/* ✅ AUMENTADO: Texto más grande */}
                  {survey.response_count} respuesta{survey.response_count !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          </Box>

          {/* ✅ OPTIMIZADO: Contenedor inferior para botones con overflow visible */}
          <Box sx={{ position: 'relative' }}>
            {/* ✅ NUEVO: Badge de imagen para encuestas con imagen */}
            {survey.image_url && (
              <Box 
                sx={{ 
                  position: 'absolute',
                  bottom: 60,
                  right: 8,
                  zIndex: 10
                }}
              >
                <Chip
                  label="📷 Contiene imagen"
                  size="small"
                  sx={{
                    background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                  }}
                />
              </Box>
            )}
            
            {/* Sistema de Like/Dislike y Comentarios - SIN OVERFLOW */}
            <Box 
              display="flex" 
              alignItems="center" 
              justifyContent="space-between" 
              sx={{ 
                mt: 3,
                pb: 2,
                overflow: 'visible'
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                {/* Like/Dislike */}
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton
                    size="medium"
                    onClick={(e) => handleLike(e, 'like')}
                    disabled={!currentUser}
                    sx={{
                      color: (userLike === 'like' || survey.user_liked) ? '#4caf50' : '#808080',  // ✅ FIX: Validación doble
                      '&:hover': {
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: '#bdbdbd',
                      }
                    }}
                  >
                    <ThumbUp fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: '20px', fontSize: '0.9rem' }}>
                    {likes}
                  </Typography>
                  
                  <IconButton
                    size="medium"
                    onClick={(e) => handleLike(e, 'dislike')}
                    disabled={!currentUser}
                    sx={{
                      color: (userLike === 'dislike' || survey.user_disliked) ? '#f44336' : '#808080',  // ✅ FIX: Validación doble
                      '&:hover': {
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: '#bdbdbd',
                      }
                    }}
                  >
                    <ThumbDown fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: '20px', fontSize: '0.9rem' }}>
                    {dislikes}
                  </Typography>
                </Box>

                {/* Comentarios */}
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Comment sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                    {survey.response_count || 0}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Menu de opciones */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }
        }}
      >
        {canDelete && ( // ✅ NUEVO: Opción de eliminar para el creador
          <MenuItem onClick={() => {
            setDeleteDialog(true);
            handleMenuClose();
          }}>
            <Delete fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="body2">Eliminar Encuesta</Typography>
          </MenuItem>
        )}
        {canReport && (
          <MenuItem onClick={handleReport}>
            <Flag fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="body2">Reportar Encuesta</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialog}
        onClose={handleReportDialogClose}
        contentType="survey"
        contentId={survey.id}
        contentTitle={survey.title}
      />

      {/* ✅ NUEVO: Dialog de confirmación para eliminar encuesta */}
      <Dialog 
        open={deleteDialog} 
        onClose={() => !deleting && setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          Eliminar Encuesta
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ¿Estás seguro de que deseas eliminar esta encuesta?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>"{survey.title}"</strong>
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
            Esta acción no se puede deshacer. Se eliminarán todos los comentarios y datos asociados.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setDeleteDialog(false)}
            disabled={deleting}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteSurvey}
            disabled={deleting}
            color="error"
            variant="contained"
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleting ? 'Eliminando...' : 'Eliminar Encuesta'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ NUEVO: Modal de Login Requerido */}
      <LoginRequiredModal
        open={loginRequiredModal}
        onClose={() => setLoginRequiredModal(false)}
        action="votar en encuestas"
      />
    </>
  );
};

export default React.memo(SurveyCard);