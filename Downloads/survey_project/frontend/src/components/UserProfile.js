import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { useUser } from '../context/UserContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Person,
  Edit,
  Assessment,
  Delete,
  Verified,
  CameraAlt,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import EditProfileModal from './EditProfileModal';
import 'react-easy-crop/react-easy-crop.css';

// ✅ NUEVO: Mapa de países para mostrar nombres completos
const countryMap = {
  'MX': 'México',
  'US': 'Estados Unidos',
  'ES': 'España',
  'AR': 'Argentina',
  'CO': 'Colombia',
  'PE': 'Perú',
  'CL': 'Chile',
  'VE': 'Venezuela',
  'EC': 'Ecuador',
  'BO': 'Bolivia',
  'UY': 'Uruguay',
  'PY': 'Paraguay',
  'PA': 'Panamá',
  'SV': 'El Salvador',
  'HN': 'Honduras',
  'CR': 'Costa Rica',
  'GT': 'Guatemala',
  'NI': 'Nicaragua',
};

const countries = [
  { code: 'MX', name: 'México' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Perú' },
  { code: 'CL', name: 'Chile' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PA', name: 'Panamá' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'HN', name: 'Honduras' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'NI', name: 'Nicaragua' },
];

const UserProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();  // ✅ FIX 3: Detectar cambios de ruta
  const [currentUser, setCurrentUser] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // ✅ NUEVO: Estados para VIP
  const [vipExpiry, setVipExpiry] = useState(null);
  const [vipDaysRemaining, setVipDaysRemaining] = useState(0);
  const [vipTimeRemaining, setVipTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });
  
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    age: '',
    country: '',
  });

  const [userSurveys, setUserSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // ✅ NUEVO: Estados para editar apodo
  const [editNicknameModal, setEditNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);

  // ✅ NUEVO: Estados para subir foto de perfil VIP
  const { user: contextUser, updateUser } = useUser();
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [photoWarningAccepted, setPhotoWarningAccepted] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const cropTimerRef = useRef(null);

  // ✅ PROTECCIÓN DE AUTENTICACIÓN: Redirigir a login si no está autenticado
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await surveyAPI.getUserProfile();
      const profile = response.data.profile;
      
      // ✅ DEBUG: Ver qué datos llegan del backend
      console.log('Datos de perfil recibidos:', profile);
      
      console.log('🔍 AUDITORÍA - Objeto currentUser que se renderizará:', {
        username: profile.username || profile.user?.username,
        is_vip: profile.is_vip,
        vip_expiry: profile.vip_expiry,
        vip_days_remaining: profile.vip_days_remaining,
        profile_completo: profile,
      });
      
      setCurrentUser({
        username: profile.username || profile.user?.username,
        email: profile.email || profile.user?.email,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        age: profile.age || '',
        country: profile.country || '',
        gender: profile.gender || '',
        is_vip: profile.is_vip || false,
        karma: profile.karma || 0,
        profile_image: profile.profile_image || null,
      });
      
      // ✅ NUEVO: Guardar información de vencimiento VIP
      if (profile.vip_expiry) {
        console.log('✅ VIP Expiry encontrado:', profile.vip_expiry);
        setVipExpiry(profile.vip_expiry);
        setVipDaysRemaining(profile.vip_days_remaining || 0);
      } else {
        console.log('⚠️ VIP Expiry NO encontrado en la respuesta');
        // ✅ FALLBACK: Intentar obtener suscripción si profile.is_vip es true pero no hay vip_expiry
        if (profile.is_vip) {
          console.log('🔄 Usuario es VIP pero sin vip_expiry - consultando suscripción...');
          surveyAPI.getUserSubscription().then(subResp => {
            const subData = subResp.data;
            if (subData.has_subscription && subData.subscription?.end_date) {
              setVipExpiry(subData.subscription.end_date);
              setVipDaysRemaining(subData.subscription.days_remaining || 0);
            }
          }).catch(err => console.error('Error fetching subscription fallback:', err));
        }
      }
      
      setProfileData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || profile.user?.email || '',
        age: profile.age || '',
        country: profile.country || '',
        gender: profile.gender || '',
      });
    } catch (err) {
      setError('Error al cargar el perfil');
      console.error('Error cargando perfil:', err);
    }
  }, []);



  const loadUserSurveys = useCallback(async () => {
    setLoadingSurveys(true);
    try {
      const response = await surveyAPI.getUserSurveys();
      
      // ✅ FIX PERFIL VACÍO: Manejar tanto objeto {surveys: []} como array directo []
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Backend envía array directo
          setUserSurveys(response.data);
        } else if (response.data.surveys && Array.isArray(response.data.surveys)) {
          // Backend envía objeto con propiedad surveys
          setUserSurveys(response.data.surveys);
        } else {
          console.warn('Formato de respuesta inesperado:', response.data);
          setUserSurveys([]);
        }
      }
    } catch (err) {
      console.error('Error cargando encuestas del usuario:', err);
      setUserSurveys([]);
    } finally {
      setLoadingSurveys(false);
    }
  }, []);

  // ✅ FIX 3: Recargar cuando cambia la ruta
  useEffect(() => {
    loadUserProfile();
    loadUserSurveys();
  }, [loadUserProfile, loadUserSurveys, location.key]);

  // ✅ NUEVO: Calcular tiempo restante VIP en tiempo real
  useEffect(() => {
    if (!vipExpiry) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiry = new Date(vipExpiry);
      const diff = expiry - now;

      if (diff <= 0) {
        setVipTimeRemaining({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setVipTimeRemaining({ days, hours, minutes });
    };

    // Calcular inmediatamente
    calculateTimeRemaining();

    // Actualizar cada minuto
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [vipExpiry]);

  const handleSave = async (updatedData) => {
    setError('');
    setSuccess('');

    try {
      const response = await surveyAPI.updateProfile(updatedData);
      
      if (response.data.success) {
        setSuccess('Perfil actualizado exitosamente');
        await loadUserProfile();
      } else {
        setError(response.data.error || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el perfil');
      console.error('Error actualizando perfil:', err);
      throw err;
    }
  };

  const handleDeleteSurvey = async (surveyId, surveyTitle, isAnonymous) => {
    if (isAnonymous && currentUser?.is_vip) {
      alert('No puedes eliminar encuestas anónimas como usuario VIP. Esto protege la privacidad de las confesiones.');
      return;
    }
    
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la encuesta "${surveyTitle}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await surveyAPI.deleteSurvey(surveyId);
      setSuccess('Encuesta eliminada exitosamente');
      loadUserSurveys();
    } catch (err) {
      setError('Error al eliminar la encuesta');
      console.error('Error eliminando encuesta:', err);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteAccountModal(true);
    setDeletePassword('');
    setError('');  // ✅ CRÍTICO: Limpiar errores anteriores
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletePassword) {
      setError('Debes ingresar tu contraseña');
      return;
    }

    setDeletingAccount(true);
    setError('');

    try {
      const response = await surveyAPI.deleteAccount(deletePassword);
      
      // ✅ CRITICAL: Solo proceder si status 200 Y success === true
      if (response.status === 200 && response.data && response.data.success === true) {
        // ✅ CRÍTICO: Limpiar TODA la sesión SOLO después de confirmación exitosa
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.clear();
        
        // Cerrar modal
        setDeleteAccountModal(false);
        
        // Mostrar mensaje de éxito
        alert('✅ Tu cuenta ha sido eliminada exitosamente');
        
        // Redirigir al login
        navigate('/login', { replace: true });
      } else {
        // Backend no confirmó éxito - mostrar error
        setError(response.data?.error || 'Error al eliminar cuenta. Verifica tu contraseña.');
        setDeletingAccount(false);
      }
    } catch (err) {
      // ✅ CRÍTICO: En caso de error (401, 400, 500), NO redirigir ni limpiar sesión
      console.error('Error eliminando cuenta:', err);
      
      // Extraer mensaje de error del backend
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Contraseña incorrecta';
      
      // ✅ CRÍTICO: SOLO actualizar estado de error - NO tocar localStorage
      setError(errorMessage);
      setDeletingAccount(false);
      
      // ✅ REGLA DE ORO: Si llegamos al catch, el usuario permanece logueado
      // NO ejecutar localStorage.clear()
      // NO ejecutar navigate('/login')
    }
  };
  
  // ✅ NUEVO: Función para actualizar apodo
  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) {
      setError('El apodo no puede estar vacío');
      return;
    }
    
    setSavingNickname(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await surveyAPI.updateNickname(newNickname.trim());
      
      if (response.data.success) {
        setSuccess('Apodo actualizado exitosamente. Recargando...');
        setEditNicknameModal(false);
        
        // ✅ ACTUALIZAR LOCALSTORAGE: Sincronizar con el nuevo username
        const updatedUser = response.data.user;
        if (updatedUser) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        // ✅ RECARGAR PÁGINA: Forzar actualización completa de la UI
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setError(response.data.error || 'Error al actualizar apodo');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar apodo');
      console.error('Error actualizando apodo:', err);
    } finally {
      setSavingNickname(false);
    }
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const maxSize = Math.max(image.width, image.height);
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setError('Solo se permiten archivos PNG, JPG o JPEG. No se aceptan GIF, SVG ni otros formatos.');
        return;
      }
      setSelectedPhoto(file);
      setPhotoWarningAccepted(false);
      setPhotoUploadOpen(true);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropChange = useCallback((location) => {
    if (cropTimerRef.current) clearTimeout(cropTimerRef.current);
    cropTimerRef.current = setTimeout(() => setCrop(location), 150);
  }, []);

  const handleZoomChange = useCallback((newZoom) => {
    if (cropTimerRef.current) clearTimeout(cropTimerRef.current);
    cropTimerRef.current = setTimeout(() => setZoom(newZoom), 150);
  }, []);

  const handlePhotoUpload = async () => {
    if (!selectedPhoto || !croppedAreaPixels) return;
    setUploadingPhoto(true);
    try {
      const imageSrc = URL.createObjectURL(selectedPhoto);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append('profile_image', croppedBlob, 'profile.jpg');
      const response = await surveyAPI.updateProfile(formData);
      if (response.data.success) {
        const profileImageUrl = response.data.profile?.profile_image || URL.createObjectURL(croppedBlob);
        const stored = localStorage.getItem('user');
        if (stored) {
          const user = JSON.parse(stored);
          user.profile_image = profileImageUrl;
          localStorage.setItem('user', JSON.stringify(user));
        }
        updateUser({ profile_image: profileImageUrl });
        setSuccess('Foto de perfil actualizada exitosamente');
        setPhotoUploadOpen(false);
        setSelectedPhoto(null);
        setCroppedAreaPixels(null);
        await loadUserProfile();
      } else {
        setError(response.data.error || 'Error al subir la foto');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!currentUser) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#7113B8',
      p: 3,
      overflowX: 'hidden', // ✅ RESPONSIVE FIX: Prevent horizontal scroll
    }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        {/* ✅ NUEVO: Avatar genérico de usuario (no logo de Cuestom) */}
        <Avatar
          sx={{
            width: { xs: 80, sm: 100, md: 120 }, // ✅ RESPONSIVE FIX
            height: { xs: 80, sm: 100, md: 120 }, // ✅ RESPONSIVE FIX
            mx: 'auto',
            mb: 2,
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }, // ✅ RESPONSIVE FIX
            fontWeight: 700,
            background: currentUser.is_vip 
              ? 'linear-gradient(45deg, #ffd700, #ffed4e)'
              : 'linear-gradient(45deg, #8C4EFF, #7113B8)',
            animation: currentUser.is_vip ? 'goldShimmer 2s ease-in-out infinite' : 'none',
            border: currentUser.is_vip ? '3px solid rgba(255, 215, 0, 0.6)' : 'none',
          }}
        >
          {(contextUser?.profile_image || currentUser.profile_image) ? (
            <img src={contextUser?.profile_image || currentUser.profile_image} alt={currentUser.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Person sx={{ fontSize: { xs: '3rem', sm: '3.5rem', md: '4rem' }, color: currentUser.is_vip ? '#333' : 'white' }} />
          )}
        </Avatar>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          mb: 1,
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }, // ✅ RESPONSIVE FIX
        }}>
          {currentUser.username}
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="center" gap={1} flexWrap="wrap"> {/* ✅ RESPONSIVE FIX: flexWrap */}
          <Chip
            icon={<Verified />}
            label="Cuenta Verificada"
            color="success"
            variant="filled"
            sx={{
              fontWeight: 600,
              backgroundColor: '#4caf50',
              color: '#ffffff',
              '& .MuiChip-icon': {
                color: '#ffffff'
              }
            }}
          />
          <Chip
            label="Usuario Activo"
            variant="filled"
            sx={{
              fontWeight: 600,
              backgroundColor: '#8C4EFF',
              color: '#ffffff'
            }}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* ✅ VIP: Subir foto de perfil */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <input
          accept="image/png, image/jpeg, image/jpg"
          style={{ display: 'none' }}
          id="profile-image-upload"
          type="file"
          onChange={handlePhotoSelect}
        />
        <label htmlFor={currentUser?.is_vip ? 'profile-image-upload' : ''}>
          <Button
            variant="outlined"
            component="span"
            disabled={!currentUser?.is_vip}
            sx={{
              color: currentUser?.is_vip ? 'white' : 'rgba(255,255,255,0.4)',
              borderColor: currentUser?.is_vip ? '#ffd700' : 'rgba(255,255,255,0.2)',
              '&:hover': currentUser?.is_vip ? {
                backgroundColor: 'rgba(255,215,0,0.1)',
                borderColor: '#ffd700',
              } : {},
            }}
          >
            {currentUser?.is_vip ? <><CameraAlt sx={{ mr: 1 }} /> Cambiar foto de perfil</> : '🔒 Solo VIP puede subir foto'}
          </Button>
        </label>
      </Box>

      {/* Diálogo de recorte y advertencia para foto VIP */}
      <Dialog open={photoUploadOpen} onClose={() => setPhotoUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#ff6b6b' }}>
          ⚠️ Aviso Importante
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2, color: '#333', fontWeight: 500 }}>
            Imágenes vulgares o inapropiadas resultarán en la suspensión permanente de la cuenta.
          </Typography>
          {selectedPhoto && (
            <Box sx={{ position: 'relative', width: '100%', height: 300, mt: 2, mb: 2 }}>
              <Cropper
                image={URL.createObjectURL(selectedPhoto)}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={handleCropChange}
                onZoomChange={handleZoomChange}
                onCropComplete={onCropComplete}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setPhotoUploadOpen(false); setSelectedPhoto(null); }} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handlePhotoUpload}
            variant="contained"
            disabled={uploadingPhoto}
            sx={{ background: 'linear-gradient(45deg, #8C4EFF, #7113B8)' }}
          >
            {uploadingPhoto ? <CircularProgress size={24} /> : 'Confirmar y Subir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Grid 
        container 
        spacing={3} 
        sx={{ 
          alignItems: 'stretch',
          width: '100%', // ✅ RESPONSIVE FIX: Full width
          flexDirection: { xs: 'column', md: 'row' }, // ✅ RESPONSIVE FIX: Stack on mobile
        }}
      >
        {/* ✅ FIX 2: Información Personal - 4 columnas (33%) - xs={12} para móvil */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 3, 
            bgcolor: '#ffffff !important',  /* ✅ FIX: Fondo blanco forzado */
            mb: 3,
            height: 'auto',  /* ✅ FIX: Altura automática */
            width: '100%', // ✅ RESPONSIVE FIX: Full width
            '&:hover': {
              backgroundColor: '#ffffff !important',  /* ✅ FIX: Mantener blanco en hover */
              transform: 'none',
              filter: 'none',
            }
          }}>
            <CardContent sx={{ p: 3, bgcolor: '#ffffff !important' }}>  {/* ✅ FIX: Fondo blanco forzado */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Información Personal
                </Typography>
              </Box>

              {/* ✅ FIX 3: Apodo vinculado a username */}
              <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" color="text.secondary">
                    Apodo/Username
                  </Typography>
                  <Tooltip title="Editar apodo" arrow>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setNewNickname(currentUser.username || '');
                        setEditNicknameModal(true);
                      }}
                      sx={{ 
                        bgcolor: '#8C4EFF',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#7113B8',
                        }
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {currentUser.username || 'No especificado'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Nombre
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {profileData.first_name || 'No especificado'}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Apellidos
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {profileData.last_name || 'No especificado'}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {profileData.email}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Edad
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {profileData.age || 'No especificado'}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  País
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {countryMap[profileData.country] || profileData.country || 'No especificado'}
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Información de la Cuenta
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Usuario desde
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Enero 2026
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Último acceso
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Hoy
                  </Typography>
                </Box>
                
                {/* ✅ NUEVO: Información VIP */}
                {currentUser.is_vip && vipExpiry && (
                  <Box sx={{ mt: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#ffd700' }}>
                      💎 Estado VIP
                    </Typography>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      background: vipTimeRemaining.days < 3 
                        ? 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)'
                        : 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                      mb: 2
                    }}>
                      <Typography variant="body2" sx={{ color: '#000', fontWeight: 600, mb: 1 }}>
                        Tiempo Restante
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#000', fontWeight: 900, mb: 0.5 }}>
                        {vipTimeRemaining.days} días {vipTimeRemaining.hours}h {vipTimeRemaining.minutes}m
                      </Typography>
                      {vipTimeRemaining.days < 3 && (
                        <Typography variant="caption" sx={{ color: '#000', fontWeight: 600 }}>
                          ⚠️ Tu suscripción está por vencer
                        </Typography>
                      )}
                    </Box>
                    {vipTimeRemaining.days < 7 && (
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                          color: '#000',
                          fontWeight: 700,
                          '&:hover': {
                            background: 'linear-gradient(45deg, #ffed4e, #ffd700)',
                          }
                        }}
                        onClick={() => navigate('/upgrade')}
                      >
                        Renovar Suscripción
                      </Button>
                    )}
                  </Box>
                )}
                
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setEditModalOpen(true)}
                  >
                    Editar Info
                  </Button>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                        const userId = currentUser?.id;
                        const vipTimeKeys = {};
                        
                        if (userId) {
                          vipTimeKeys[`vip_time_${userId}`] = localStorage.getItem(`vip_time_${userId}`);
                          vipTimeKeys[`vip_session_date_${userId}`] = localStorage.getItem(`vip_session_date_${userId}`);
                          vipTimeKeys[`vip_weekly_usage_${userId}`] = localStorage.getItem(`vip_weekly_usage_${userId}`);
                          vipTimeKeys[`vip_week_start_${userId}`] = localStorage.getItem(`vip_week_start_${userId}`);
                          vipTimeKeys[`vip_weekly_history_${userId}`] = localStorage.getItem(`vip_weekly_history_${userId}`);
                        }
                        
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        
                        if (userId) {
                          Object.entries(vipTimeKeys).forEach(([key, value]) => {
                            if (value !== null) {
                              localStorage.setItem(key, value);
                            }
                          });
                        }
                        
                        navigate('/login');
                      }
                    }}
                  >
                    Cerrar Sesión
                  </Button>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteAccount}
                  >
                    Eliminar Cuenta
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ✅ FIX 2: Mis Encuestas - 8 columnas (67%) - xs={12} para móvil */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            borderRadius: 3, 
            height: 'fit-content',  /* ✅ FIX: Ajustar al contenido */
            bgcolor: '#ffffff !important',
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            '&:hover': {
              backgroundColor: '#ffffff !important',
              transform: 'none',
              filter: 'none',
            }
          }}>
            <CardContent sx={{ 
              p: 3, 
              width: '100%', 
              boxSizing: 'border-box', 
              flexGrow: 0,  // ✅ FIX: No crecer
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: '#ffffff !important',  // ✅ FIX: Fondo blanco forzado
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                📊 Mis Encuestas
              </Typography>
              
              {loadingSurveys ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={30} />
                </Box>
              ) : userSurveys.length === 0 ? (
                <Box textAlign="center" py={3}>
                  <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No has creado encuestas aún
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/crear-encuesta')}
                  >
                    Crear Primera Encuesta
                  </Button>
                </Box>
              ) : (
                <Box sx={{ 
                  flexGrow: 0,  // ✅ FIX: No crecer, solo ajustarse al contenido
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <List sx={{ 
                    maxHeight: 600,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    width: '100%',
                    padding: 0,
                    margin: 0,  // ✅ FIX: Sin margen
                    backgroundColor: '#ffffff !important',
                    '& .MuiListItem-root': {
                      mb: 3,
                      minHeight: 80,
                      backgroundColor: '#ffffff !important',  // ✅ FIX: Fondo blanco forzado
                    }
                  }}>
                  {userSurveys.map((survey) => (
                    <React.Fragment key={survey.id}>
                      <ListItem
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: { xs: 'wrap', sm: 'nowrap' },  // ✅ FIX: Wrap en móvil
                          width: '100%',  // ✅ FIX: Ancho 100%
                          px: { xs: 1, sm: 2 },  // ✅ FIX: Padding responsivo
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                          <Assessment sx={{ color: survey.is_active ? '#8C4EFF' : '#9e9e9e' }} />
                        </ListItemIcon>
                        <ListItemText
                          sx={{ 
                            flex: 1, 
                            minWidth: 0,
                            mr: { xs: 0, sm: 2 },
                            mb: { xs: 1, sm: 0 },
                            width: { xs: '100%', sm: 'auto' },
                          }}
                          primaryTypographyProps={{ component: 'div', variant: 'body2', sx: { fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' } }}
                          primary={survey.title}
                          secondaryTypographyProps={{ component: 'div' }}
                          secondary={
                            <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
                              <Chip
                                label={survey.is_active ? 'Activa' : 'Inactiva'}
                                size="small"
                                color={survey.is_active ? 'success' : 'default'}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              <Typography variant="caption">
                                {survey.response_count || 0} respuestas
                              </Typography>
                            </Box>
                          }
                        />
                        <Box 
                          display="flex" 
                          gap={1} 
                          flexWrap="wrap"  // ✅ FIX: Wrap en móvil
                          justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                          width={{ xs: '100%', sm: 'auto' }}  // ✅ FIX: Ancho completo en móvil
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/encuestas/${survey.id}`)}
                            sx={{ minWidth: { xs: 'auto', sm: 64 } }}  // ✅ FIX: Botón más pequeño en móvil
                          >
                            Ver
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Delete />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSurvey(survey.id, survey.title, survey.is_anonymous);
                            }}
                            disabled={survey.is_anonymous && currentUser?.is_vip}
                            title={survey.is_anonymous && currentUser?.is_vip ? 'No puedes eliminar encuestas anónimas como VIP' : 'Eliminar encuesta'}
                            sx={{ minWidth: { xs: 'auto', sm: 100 } }}  // ✅ FIX: Botón más pequeño en móvil
                          >
                            Eliminar
                          </Button>
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
                </Box>
              )}
              

            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={editNicknameModal}
        onClose={() => setEditNicknameModal(false)}
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: 9999 }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          Editar Apodo/Username
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Tu apodo es cómo te identificas en la plataforma.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            - Solo puedes volver a cambiar tu apodo después de {currentUser?.is_vip ? '7 días' : '1 mes'}.
          </Alert>
          <Alert severity="info" sx={{ mb: 2 }}>
            - Cambiar tu apodo solo afectará a tus futuras encuestas y comentarios.
          </Alert>
          <TextField
            fullWidth
            label="Nuevo Apodo"
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            disabled={savingNickname}
            autoFocus
            inputProps={{ maxLength: 25 }}
            helperText={`${newNickname.length}/25 caracteres`}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setEditNicknameModal(false)}
            disabled={savingNickname}
            size="large"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpdateNickname}
            variant="contained"
            size="large"
            disabled={!newNickname.trim() || savingNickname}
            sx={{
              px: 4,
              background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
              '&:hover': {
                background: 'linear-gradient(45deg, #7113B8, #8C4EFF)',
              }
            }}
          >
            {savingNickname ? <CircularProgress size={20} /> : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteAccountModal}
        onClose={() => setDeleteAccountModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          ⚠️ Eliminar Cuenta Permanentemente
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Atención: Esta acción es irreversible
            </Typography>
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Se eliminarán todos tus datos permanentemente.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label="Contraseña"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            disabled={deletingAccount}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteAccountModal(false)}
            disabled={deletingAccount}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDeleteAccount}
            color="error"
            variant="contained"
            disabled={!deletePassword || deletingAccount}
          >
            {deletingAccount ? <CircularProgress size={20} /> : 'Eliminar Cuenta'}
          </Button>
        </DialogActions>
      </Dialog>

      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        profileData={profileData}
        onSave={handleSave}
      />
    </Box>
  );
};

export default UserProfile;
