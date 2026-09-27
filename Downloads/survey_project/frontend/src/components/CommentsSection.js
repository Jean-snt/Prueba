import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  Paper,
  InputLabel,
  Select,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Send,
  Reply,
  MoreVert,
  Edit,
  Delete,
  ExpandMore,
  ExpandLess,
  Flag,
  Schedule,
  Diamond,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import ReportDialog from './ReportDialog';
import LoginRequiredModal from './LoginRequiredModal';

// ✅ Estilos de género con colores distintivos
const GENDER_STYLES = {
  M: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    label: 'M'
  },
  F: {
    backgroundColor: '#FCE4EC',
    color: '#C2185B',
    label: 'F'
  },
  A: {
    backgroundColor: '#F5F5F5',
    color: '#616161',
    label: 'A'
  }
};

const CommentsSection = ({ surveyId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // ✅ OPTIMIZACIÓN: Usar useRef para inputs para evitar re-renders
  const newCommentRef = React.useRef('');
  const [newCommentDisplay, setNewCommentDisplay] = useState('');  // Solo para mostrar contador
  
  const [replyingTo, setReplyingTo] = useState(null);
  const replyTextRef = React.useRef('');  // ✅ OPTIMIZACIÓN: useRef para reply
  
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [menuPosition, setMenuPosition] = useState(null);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [reportDialog, setReportDialog] = useState(false);
  const [loginRequiredModal, setLoginRequiredModal] = useState(false); // ✅ NUEVO
  const [reportedComments, setReportedComments] = useState(new Set());
  const identityLoadedRef = React.useRef(false);

  // ✅ IDENTIDAD PEGAJOSA: Usar useRef para persistir entre comentarios
  const persistentIdentityRef = React.useRef(null);
  
  // Estado para identidad dinámica al comentar
  const [commentIdentity, setCommentIdentity] = useState({
    gender: '',
    age: '',
    showRealName: true
  });

  // ✅ OPTIMIZACIÓN: Envolver fetchComments en useCallback
  const fetchComments = React.useCallback(async () => {
    try {
      const response = await surveyAPI.getSurveyComments(surveyId);
      setComments(response.data.comments);
      setError('');
    } catch (err) {
      setError('Error al cargar comentarios');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  // ✅ FIX 5: ELIMINAR IDENTIDAD REPETITIVA - Cargar automáticamente del perfil
  useEffect(() => {
    let isMounted = true;
    
    const loadComments = async () => {
      if (isMounted) {
        await fetchComments();
      }
    };
    
    loadComments();
    
    // ✅ FIX 5: Si el usuario está autenticado, cargar identidad UNA SOLA VEZ
    if (currentUser && !identityLoadedRef.current) {
      loadUserIdentity();
      identityLoadedRef.current = true;
    }
    
    return () => {
      isMounted = false;
    };
  }, [surveyId, currentUser, fetchComments]);

  const loadUserIdentity = async () => {
    // ✅ IDENTIDAD PEGAJOSA: Si ya existe, no recargar
    if (persistentIdentityRef.current) {
      setCommentIdentity(persistentIdentityRef.current);
      return;
    }
    
    try {
      const profileResponse = await surveyAPI.getUserProfile();
      const profile = profileResponse.data.profile;
      
      const identity = {
        gender: profile.gender || 'A',
        age: profile.age || '',
        showRealName: true
      };
      
      // ✅ GUARDAR en ref para persistencia
      persistentIdentityRef.current = identity;
      setCommentIdentity(identity);
    } catch (err) {
      const defaultIdentity = {
        gender: 'A',
        age: '',
        showRealName: true
      };
      persistentIdentityRef.current = defaultIdentity;
      setCommentIdentity(defaultIdentity);
    }
  };

  const handleMenuOpen = React.useCallback((event, comment) => {
    event.preventDefault();
    event.stopPropagation();
    
    const newPosition = {
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    };
    
    // ✅ CRÍTICO: Actualizar TODOS los estados en el mismo ciclo
    setMenuPosition(newPosition);
    setActiveCommentId(comment.id);
    setSelectedComment(comment);
  }, []);

  const handleMenuClose = React.useCallback(() => {
    setMenuPosition(null);
    setActiveCommentId(null);
    // ✅ NO limpiar selectedComment aquí para que el modal funcione
  }, []);

  const handleSubmitComment = async () => {
    // ✅ NUEVO: Verificar si el usuario está logueado
    if (!currentUser) {
      setLoginRequiredModal(true);
      return;
    }

    const commentText = newCommentRef.current.trim();
    if (!commentText) return;

    setSubmitting(true);
    try {
      const response = await surveyAPI.createComment(surveyId, {
        content: commentText,
        comment_identity: commentIdentity
      });
      
      if (response.data.success) {
        // ✅ Recargar comentarios después de publicar
        await fetchComments();
        newCommentRef.current = '';
        setNewCommentDisplay('');
        const textarea = document.querySelector('textarea[placeholder="Escribe un comentario..."]');
        if (textarea) textarea.value = '';
      } else {
        setError(response.data.error || 'Error al enviar comentario');
      }
    } catch (err) {
      setError('Error al enviar comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!currentUser) {
      setLoginRequiredModal(true);
      return;
    }

    const replyContent = replyTextRef.current.trim();
    if (!replyContent) {
      alert('Por favor escribe un mensaje antes de responder');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        content: replyContent,
        parent_id: parentId,
        comment_identity: persistentIdentityRef.current || commentIdentity  // ✅ FIX 2: Usar identidad persistente
      };
      
      const response = await surveyAPI.createComment(surveyId, payload);
      
      if (response.data.success) {
        await fetchComments();
        setReplyingTo(null);
        replyTextRef.current = '';
        setExpandedComments(prev => new Set([...prev, parentId]));
      } else {
        setError(response.data.error || 'Error al enviar respuesta');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editText.trim()) return;

    try {
      const response = await surveyAPI.updateComment(surveyId, commentId, {
        content: editText.trim()
      });
      
      if (response.data.success) {
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            return response.data.comment;
          }
          if (comment.replies) {
            comment.replies = comment.replies.map(reply => 
              reply.id === commentId ? response.data.comment : reply
            );
          }
          return comment;
        }));
        
        setEditingComment(null);
        setEditText('');
      }
    } catch (err) {
      setError('Error al editar comentario');
    }
  };

  const handleDeleteComment = async (id) => {
    try {
      await surveyAPI.deleteComment(surveyId, id);
      
      setComments(prev => prev.filter(comment => {
        if (comment.id === id) return false;
        if (comment.replies) {
          comment.replies = comment.replies.filter(reply => reply.id !== id);
        }
        return true;
      }));
      
      setSelectedComment(null);
    } catch (err) {
      setError('Error al eliminar comentario');
    }
  };

  const handleReportComment = React.useCallback(() => {
    // ✅ OPTIMIZADO: Usar selectedComment que ya está seteado por handleMenuOpen
    if (!selectedComment) {
      alert('Error: No se pudo encontrar el comentario');
      return;
    }
    
    if (reportedComments.has(selectedComment.id)) {
      alert('Ya has reportado este contenido');
      return;
    }
    
    if (!currentUser) {
      alert('Debes iniciar sesión para reportar contenido');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Debes iniciar sesión para reportar contenido');
      return;
    }
    
    // ✅ CRÍTICO: Abrir modal inmediatamente
    setReportDialog(true);
  }, [selectedComment, currentUser, reportedComments]);
  
  const handleReportDialogClose = React.useCallback((success = false) => {
    if (success && selectedComment) {
      setReportedComments(prev => new Set([...prev, selectedComment.id]));
    }
    
    setReportDialog(false);
    setSelectedComment(null);
  }, [selectedComment]);

  const toggleExpanded = (commentId) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const getCountryFlag = (countryCode) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'hace unos minutos';
    } else if (diffInHours < 24) {
      return `hace ${Math.floor(diffInHours)} hora${Math.floor(diffInHours) !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const CommentItem = React.memo(({ comment, isReply = false }) => {
    const commentGender = comment.author?.gender || 'A';
    const genderStyle = GENDER_STYLES[commentGender] || GENDER_STYLES['A'];
    
    // ✅ CRÍTICO: Detectar si el autor es VIP - TODAS las rutas posibles
    const isAuthorVip = Boolean(
      comment.author?.is_vip || 
      comment.author?.profile?.is_vip || 
      comment.user?.is_vip ||
      comment.is_vip ||
      comment.author_is_vip
    );
    
    return (
      <Box sx={{ 
        mb: isReply ? 1 : 2, 
        width: '100%', 
        maxWidth: '100%',
        overflow: 'visible',
        position: 'relative',
        paddingLeft: isReply ? '20px' : 0,
      }}>
        <Card 
          disableRipple={true}
          disableTouchRipple={true}
          variant={isReply ? "outlined" : "elevation"} 
          sx={{ 
            backgroundColor: genderStyle 
              ? `${genderStyle.backgroundColor} !important`
              : '#ffffff',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'visible !important',
            color: '#000000 !important',
            border: '2px solid transparent',  // ✅ FIX: Borde transparente por defecto
            willChange: 'transform',  // ✅ FIX: Optimización para animaciones
            transition: 'all 0.3s ease',  // ✅ FIX: Transición suave
            '& .MuiTypography-root': {
              color: '#000000 !important',
            },
            '& .MuiCardActionArea-focusHighlight': {
              opacity: '0 !important',
              background: 'transparent !important'
            },
            '& .MuiButtonBase-root:hover': {
              opacity: '0 !important',
              backgroundColor: 'transparent !important'
            },
            '&:hover': {
              backgroundColor: genderStyle 
                ? `${genderStyle.backgroundColor} !important`
                : '#ffffff !important',
              borderColor: 'rgba(0, 0, 0, 0.1)',  // ✅ FIX: Solo cambiar color del borde
              filter: 'none !important',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1) !important',
              transform: 'scale(1.02)'
            }
          }}
        >
          <CardContent sx={{ pb: 2, overflow: 'visible' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                  {comment.author?.username ? comment.author.username[0].toUpperCase() : 'A'}
                </Avatar>
                <Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {comment.author?.display_name || 'Usuario anónimo'}
                    </Typography>
                    
                    {/* ✅ DIAMANTE VIP: Icono negro junto al nombre */}
                    {isAuthorVip && (
                      <Diamond 
                        sx={{ 
                          fontSize: 14, 
                          color: '#000000',
                          ml: 0.5,
                          opacity: 1
                        }} 
                        titleAccess="Usuario VIP"
                      />
                    )}
                    
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {genderStyle && (
                        <Chip 
                          label={genderStyle.label} 
                          size="small" 
                          sx={{ 
                            fontSize: '0.7rem', 
                            height: 18,
                            backgroundColor: `${genderStyle.backgroundColor} !important`,
                            color: `${genderStyle.color} !important`,
                            border: `1px solid ${genderStyle.color} !important`,
                          }} 
                        />
                      )}
                      
                      {comment.author?.age && (
                        <Chip 
                          label={`${comment.author.age} años`} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 18 }} 
                        />
                      )}
                      
                      {comment.author?.country && (
                        <img
                          src={getCountryFlag(comment.author.country.code)}
                          alt={comment.author.country.name}
                          style={{ borderRadius: 2 }}
                          title={comment.author.country.name}
                        />
                      )}
                    </Box>
                    
                    {comment.is_edited && (
                      <Chip label="editado" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                    )}
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Schedule sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(comment.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* ✅ BOTÓN DE 3 PUNTOS: Color visible en hover */}
              {currentUser && (
                <Box sx={{ position: 'relative', zIndex: 10 }}>
                  <button
                    id={`comment-menu-button-${comment.id}`}
                    onClick={(e) => handleMenuOpen(e, comment)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      color: '#333',
                      transition: 'background-color 0.2s ease',
                      position: 'relative',
                      zIndex: 10,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.color = '#333';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#333';
                    }}
                  >
                    <MoreVert fontSize="small" />
                  </button>
                </Box>
              )}
            </Box>

            {editingComment === comment.id ? (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Editar comentario..."
                  variant="outlined"
                  size="small"
                />
                <Box display="flex" gap={1} mt={1}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleEditComment(comment.id)}
                    disabled={!editText.trim()}
                  >
                    Guardar
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingComment(null);
                      setEditText('');
                    }}
                  >
                    Cancelar
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.5 }}>
                {comment.content}
              </Typography>
            )}

            {/* ✅ LIMPIADO: Solo botón de responder, SIN likes/dislikes */}
            {currentUser && editingComment !== comment.id && (
              <Box display="flex" alignItems="center" gap={2} mt={2}>
                {/* Botón de responder */}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Reply />}
                  onClick={() => {
                    setReplyingTo(comment.id);
                    replyTextRef.current = '';
                  }}
                  disabled={false}
                >
                  Responder
                </Button>
                {comment.replies_count > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={expandedComments.has(comment.id) ? <ExpandLess /> : <ExpandMore />}
                    onClick={() => toggleExpanded(comment.id)}
                  >
                    {expandedComments.has(comment.id) 
                      ? 'Ocultar respuestas' 
                      : `Ver ${comment.replies_count} respuesta${comment.replies_count !== 1 ? 's' : ''}`
                    }
                  </Button>
                )}
              </Box>
            )}

            {replyingTo === comment.id && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  defaultValue=""
                  onChange={(e) => {
                    replyTextRef.current = e.target.value;
                  }}
                  placeholder={`Responder a ${comment.author.display_name}...`}
                  variant="outlined"
                  size="small"
                />
                <Box display="flex" gap={1} mt={1}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Send />}
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting}
                  >
                    {submitting ? <CircularProgress size={16} /> : 'Responder'}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setReplyingTo(null);
                      replyTextRef.current = '';
                    }}
                  >
                    Cancelar
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        <Menu
          id={`comment-menu-${comment.id}`}
          open={activeCommentId === comment.id && menuPosition !== null}
          onClose={handleMenuClose}
          anchorReference="anchorPosition"
          anchorPosition={
            menuPosition !== null
              ? { top: menuPosition.mouseY, left: menuPosition.mouseX }
              : undefined
          }
          disableScrollLock={true}
          MenuListProps={{
            'aria-labelledby': `comment-menu-button-${comment.id}`,
          }}
          PaperProps={{
            elevation: 3,
            sx: {
              minWidth: 180,
              borderRadius: 2,
              zIndex: 1400,
            }
          }}
        >
          {/* ✅ LÓGICA DE ANONIMATO MEJORADA */}
          {comment.author?.username === currentUser?.username ? (
            // Es el autor (anónimo o no): Mostrar Editar/Eliminar, NO Reportar
            [
              <MenuItem
                key="edit"
                onClick={() => {
                  setEditingComment(comment.id);
                  setEditText(comment.content);
                  handleMenuClose();
                }}
              >
                <Edit fontSize="small" sx={{ mr: 1 }} />
                Editar
              </MenuItem>,
              <MenuItem
                key="delete"
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres eliminar este comentario? Esta acción no se puede deshacer.')) {
                    handleDeleteComment(comment.id);
                  }
                  handleMenuClose();
                }}
              >
                <Delete fontSize="small" sx={{ mr: 1 }} />
                Eliminar
              </MenuItem>
            ]
          ) : (
            // No es el autor (anónimo o no): Mostrar SOLO Reportar
            <MenuItem
              onClick={() => {
                handleReportComment();
                handleMenuClose();
              }}
            >
              <Flag fontSize="small" sx={{ mr: 1 }} />
              Reportar
            </MenuItem>
          )}
        </Menu>

        {/* ✅ FIX RECURSIVIDAD: Contenedor de replies con altura automática y sin restricciones */}
        {comment.replies && comment.replies.length > 0 && expandedComments.has(comment.id) && (
          <Box sx={{ 
            mt: 1,
            width: '100%',
            maxWidth: '100%',
            overflow: 'visible',
            minHeight: 'auto',
            maxHeight: 'none',
            height: 'auto',
            display: 'block',
            position: 'relative',
            zIndex: 1,
            opacity: 1,
            visibility: 'visible',
            backgroundColor: 'transparent',
          }}>
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </Box>
        )}
      </Box>
    );
  });

  // ✅ OPTIMIZACIÓN: Memoizar función recursiva para evitar recálculos innecesarios
  const countAllComments = React.useMemo(() => {
    const count = (commentsList) => {
      let total = commentsList.length;
      commentsList.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          total += count(comment.replies);
        }
      });
      return total;
    };
    return count;
  }, []);

  const totalInteractions = countAllComments(comments);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        💬 Comentarios ({totalInteractions})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {currentUser && (
        <Card sx={{ 
          mb: 3, 
          bgcolor: '#ffffff',
          '& .MuiCardActionArea-focusHighlight': {
            opacity: '0 !important',
            background: 'transparent !important'
          },
          '& .MuiButtonBase-root:hover': {
            opacity: '0 !important',
            backgroundColor: 'transparent !important'
          },
          '&:hover': {
            backgroundColor: '#ffffff !important',
            filter: 'none !important',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1) !important'
          }
        }}>
          <CardContent>
            {/* ✅ RESTAURADO: Selector de Identidad para usuarios autenticados */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                🎭 Configura tu Identidad para este Comentario
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Género</InputLabel>
                    <Select
                      value={commentIdentity.gender}
                      onChange={(e) => {
                        const newIdentity = { ...commentIdentity, gender: e.target.value };
                        setCommentIdentity(newIdentity);
                        persistentIdentityRef.current = newIdentity; // ✅ PERSISTIR
                      }}
                      label="Género"
                    >
                      <MenuItem value="M">Masculino</MenuItem>
                      <MenuItem value="F">Femenino</MenuItem>
                      <MenuItem value="A">Anónimo</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Edad (opcional)"
                    value={commentIdentity.age}
                    onChange={(e) => {
                      const newIdentity = { ...commentIdentity, age: e.target.value };
                      setCommentIdentity(newIdentity);
                      persistentIdentityRef.current = newIdentity; // ✅ PERSISTIR
                    }}
                    inputProps={{ min: 13, max: 120 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Mostrar Nombre</InputLabel>
                    <Select
                      value={commentIdentity.showRealName}
                      onChange={(e) => {
                        const newIdentity = { ...commentIdentity, showRealName: e.target.value };
                        setCommentIdentity(newIdentity);
                        persistentIdentityRef.current = newIdentity; // ✅ PERSISTIR
                      }}
                      label="Mostrar Nombre"
                    >
                      <MenuItem value={true}>Sí, mostrar mi nombre</MenuItem>
                      <MenuItem value={false}>No, mantener anónimo</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Alert severity="info" sx={{ mt: 2 }}>
                Tu identidad se aplicará solo a este comentario. Puedes cambiarla en cada comentario.
              </Alert>
            </Paper>

            <Box display="flex" gap={2}>
              <Avatar sx={{ width: 40, height: 40 }}>
                {currentUser.username[0].toUpperCase()}
              </Avatar>
              <Box flexGrow={1}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  defaultValue=""
                  onChange={(e) => {
                    newCommentRef.current = e.target.value;
                    setNewCommentDisplay(e.target.value);
                  }}
                  placeholder="Escribe un comentario..."
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {newCommentDisplay.length}/1000 caracteres
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={handleSubmitComment}
                    disabled={!newCommentDisplay.trim() || submitting || newCommentDisplay.length > 1000}
                  >
                    {submitting ? <CircularProgress size={20} /> : 'Comentar'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {comments.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay comentarios aún
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentUser ? 'Sé el primero en comentar' : 'Inicia sesión para comentar'}
          </Typography>
        </Box>
      ) : (
        <Box>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </Box>
      )}

      <ReportDialog
        open={reportDialog && selectedComment !== null}
        onClose={handleReportDialogClose}
        contentType="comment"
        contentId={selectedComment?.id}
        contentTitle={selectedComment?.content}
      />

      {/* ✅ NUEVO: Modal de Login Requerido */}
      <LoginRequiredModal
        open={loginRequiredModal}
        onClose={() => setLoginRequiredModal(false)}
        action="comentar en encuestas"
      />
    </Box>
  );
};

export default CommentsSection;
