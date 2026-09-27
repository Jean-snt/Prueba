import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Person, Email, Lock, Cake, Public, Wc, Male, Female, VisibilityOff } from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import './Auth.css';

// ✅ CONSTANTE: Altura uniforme para todos los campos
const FIELD_HEIGHT = 56;

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

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    age: '',
    country: '',
    gender: '',
  });

  const [errors, setErrors] = useState({});
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [nicknameDebounceTimer, setNicknameDebounceTimer] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // ✅ Debounce para nickname (validación en tiempo real mientras escribe)
    if (name === 'nickname' && value.length >= 3) {
      // Limpiar timer anterior
      if (nicknameDebounceTimer) {
        clearTimeout(nicknameDebounceTimer);
      }
      
      // Limpiar error anterior mientras escribe
      if (errors.nickname) {
        setErrors(prev => ({
          ...prev,
          nickname: ''
        }));
      }
      
      // Establecer nuevo timer de 500ms
      const timer = setTimeout(() => {
        checkNicknameAvailability(value);
      }, 500);
      
      setNicknameDebounceTimer(timer);
    }
    
    // Limpiar error general cuando el usuario empieza a escribir
    if (error) {
      setError('');
    }
    
    if (errors[name] && name !== 'nickname') {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // ✅ FUNCIÓN DE VALIDACIÓN: Verificar nickname
  const checkNicknameAvailability = async (nickname) => {
    const trimmedNickname = nickname.trim();
    
    // Solo validar si hay nickname y tiene al menos 3 caracteres
    if (!trimmedNickname || trimmedNickname.length < 3) {
      return;
    }

    setCheckingNickname(true);
    
    try {
      // Hacer petición al backend para verificar si el nickname existe
      const response = await surveyAPI.checkNickname(trimmedNickname);
      
      if (!response.data.available) {
        setErrors(prev => ({
          ...prev,
          nickname: 'Este apodo ya está registrado. Elige otro.'
        }));
      }
    } catch (err) {
      // Si hay error en la petición, no mostrar nada (evitar falsos positivos)
    } finally {
      setCheckingNickname(false);
    }
  };

  // ✅ VALIDACIÓN EN TIEMPO REAL: Verificar nickname al perder el foco (backup del debounce)
  const handleNicknameBlur = async () => {
    const nickname = formData.nickname.trim();
    
    // Solo validar si hay nickname y tiene al menos 3 caracteres
    if (!nickname || nickname.length < 3) {
      return;
    }

    // Si ya hay un error, no volver a validar
    if (errors.nickname) {
      return;
    }

    await checkNicknameAvailability(nickname);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nickname.trim()) {
      newErrors.nickname = 'El nombre de usuario / apodo es requerido';
    } else if (formData.nickname.length < 3) {
      newErrors.nickname = 'Debe tener al menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Los apellidos son requeridos';
    }

    // ✅ VALIDACIÓN: Edad mínima 18 años
    if (formData.age) {
      const ageNum = parseInt(formData.age);
      if (ageNum < 18) {
        newErrors.age = 'Debes tener al menos 18 años para registrarte';
      } else if (ageNum > 120) {
        newErrors.age = 'La edad debe ser menor a 120 años';
      }
    }

    if (!formData.country || formData.country.trim() === '') {
      newErrors.country = 'El campo país es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstFieldError = Object.values(errors).find(err => err);
      setError(firstFieldError || 'Corrige los errores en el formulario antes de continuar.');
      return;
    }

    if (checkingNickname) {
      setCheckingNickname(false);
    }
    if (nicknameDebounceTimer) {
      clearTimeout(nicknameDebounceTimer);
      setNicknameDebounceTimer(null);
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await surveyAPI.register({
        username: formData.nickname,
        nickname: formData.nickname || null,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        age: formData.age ? parseInt(formData.age) : null,
        country: formData.country || null,
        gender: formData.gender || null,
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        if (response.data.requires_verification) {
          setTimeout(() => {
            navigate('/verify-account', { 
              state: { username: response.data.username }
            });
          }, 2000);
        } else {
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        setError(response.data.error || 'Error al crear la cuenta');
      }
    } catch (err) {
      console.error('❌ Register error:', err.response?.data || err.message);
      if (err.response?.data?.error) {
        const errorMessage = err.response.data.error;
        setError(errorMessage);
        if (errorMessage.toLowerCase().includes('apodo')) {
          setErrors(prev => ({ ...prev, nickname: errorMessage }));
        }
        if (errorMessage.toLowerCase().includes('edad') || errorMessage.toLowerCase().includes('18 años')) {
          setErrors(prev => ({ ...prev, age: errorMessage }));
        }
      } else {
        setError('Error al conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#7113B8',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2,
      }}
    >
        <Paper
          elevation={24}
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: 1000 },
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            p: { xs: 2, sm: 4, md: 6 },
          }}
        >
          <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
          <Box textAlign="center" mb={4}>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.25rem', md: '2.25rem' },
                background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Cuestom
            </Typography>
            <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
              Únete a nuestra comunidad
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.95rem' } }}>
              Crea tu cuenta y comienza a participar en encuestas
            </Typography>
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

          <form onSubmit={handleSubmit}>
            {/* CONTENEDOR 1 - FILA 1: Nombre | Apellidos | Apodo - FLEXBOX */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: '16px', sm: '24px' },
              mb: 3,
              width: '100%',
              px: { xs: 0, sm: '24px' },
              boxSizing: 'border-box'
            }}>
              {/* Nombre */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  fullWidth
                  label="Nombre"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  error={!!errors.first_name}
                  helperText={errors.first_name}
                  required
                  inputProps={{ maxLength: 25 }}
                  InputProps={{
                    startAdornment: <Person sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                      boxSizing: 'border-box',
                    }
                  }}
                />
              </Box>
              
              {/* Apellidos */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  fullWidth
                  label="Apellidos"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  error={!!errors.last_name}
                  helperText={errors.last_name}
                  required
                  inputProps={{ maxLength: 25 }}
                  InputProps={{
                    startAdornment: <Person sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                      boxSizing: 'border-box',
                    }
                  }}
                />
              </Box>
              
              {/* Apodo/Nickname como nombre de usuario (requerido) */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  fullWidth
                  label="Usuario / Apodo *"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  onBlur={handleNicknameBlur}
                  error={!!errors.nickname}
                  helperText={errors.nickname || 'Tu nombre de usuario único (mín. 3 caracteres)'}
                  required
                  inputProps={{ maxLength: 25, minLength: 3 }}
                  InputProps={{
                    startAdornment: <Person sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />,
                    endAdornment: checkingNickname ? (
                      <CircularProgress size={20} sx={{ color: 'action.active' }} />
                    ) : null,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                      boxSizing: 'border-box',
                    }
                  }}
                />
              </Box>
            </Box>

            {/* CONTENEDOR 2 - FILA 2: Edad | País | Género - REGLA DE PLATINO */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: '16px', sm: '24px' },
              mb: 3,
              width: '100%',
              px: { xs: 0, sm: '24px' },
              boxSizing: 'border-box'
            }}>
              {/* Edad - MÍNIMO 18 AÑOS */}
              <Box sx={{ 
                flex: 1, 
                minWidth: 0,
                '& .MuiInputBase-root': { width: '100%' } 
              }}>
                <TextField
                  fullWidth
                  label="Edad (opcional)"
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                  error={!!errors.age}
                  helperText={errors.age || 'Edad mínima: 18 años'}
                  inputProps={{ min: 18, max: 120 }}
                  InputProps={{
                    startAdornment: <Cake sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                      boxSizing: 'border-box',
                    }
                  }}
                />
              </Box>
              
              {/* País */}
              <Box sx={{ 
                flex: 1, 
                minWidth: 0,
                '& .MuiInputBase-root': { width: '100%' } 
              }}>
                <FormControl 
                  fullWidth 
                  required 
                  error={!!errors.country} 
                  variant="outlined"
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                    }
                  }}
                >
                  <InputLabel>País</InputLabel>
                  <Select
                    label="País"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    startAdornment={<Public sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />}
                  >
                    <MenuItem value="">
                      <em>Selecciona tu país</em>
                    </MenuItem>
                    {countries.map((country) => (
                      <MenuItem key={country.code} value={country.code}>
                        {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              {/* Género con Icono Dinámico y Placeholder No Seleccionable */}
              <Box sx={{ 
                flex: 1, 
                minWidth: 0,
                '& .MuiInputBase-root': { width: '100%' } 
              }}>
                <FormControl 
                  fullWidth 
                  variant="outlined"
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                    }
                  }}
                >
                  <InputLabel>Género (opcional)</InputLabel>
                  <Select
                    label="Género (opcional)"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    displayEmpty
                    renderValue={(selected) => {
                      if (!selected) {
                        return <em style={{ color: '#999', fontStyle: 'normal' }}>Selecciona una opción</em>;
                      }
                      const labels = { 'M': 'Masculino', 'F': 'Femenino', 'A': 'Anónimo' };
                      return labels[selected];
                    }}
                    startAdornment={
                      formData.gender === 'M' ? (
                        <Male sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />
                      ) : formData.gender === 'F' ? (
                        <Female sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />
                      ) : formData.gender === 'A' ? (
                        <VisibilityOff sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />
                      ) : (
                        <Wc sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />
                      )
                    }
                  >
                    <MenuItem value="" disabled>
                      <em>Selecciona una opción</em>
                    </MenuItem>
                    <MenuItem value="M">Masculino</MenuItem>
                    <MenuItem value="F">Femenino</MenuItem>
                    <MenuItem value="A">Anónimo</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* CONTENEDOR 3 - FILA 3: Email | Contraseña | Confirmar Contraseña - FLEXBOX */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: '16px', sm: '24px' },
              mb: 3,
              width: '100%',
              px: { xs: 0, sm: '24px' },
              boxSizing: 'border-box'
            }}>
              {/* Email */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                  InputProps={{
                    startAdornment: <Email sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                      boxSizing: 'border-box',
                    }
                  }}
                />
              </Box>
              
              {/* Contraseña */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  fullWidth
                  label="Contraseña"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  required
                  inputProps={{ maxLength: 50 }}
                  InputProps={{
                    startAdornment: <Lock sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                      boxSizing: 'border-box',
                    }
                  }}
                />
              </Box>
              
              {/* Confirmar Contraseña */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  fullWidth
                  label="Confirmar contraseña"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  required
                  inputProps={{ maxLength: 50 }}
                  InputProps={{
                    startAdornment: <Lock sx={{ color: 'action.active', mr: 1, fontSize: { xs: 18, sm: 20 } }} />,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      height: FIELD_HEIGHT,
                      boxSizing: 'border-box',
                    }
                  }}
                />
              </Box>
            </Box>

            {/* CONTENEDOR 4 - FILA 4: Botón Crear Cuenta */}
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 4, px: { xs: 0, sm: '24px' }, boxSizing: 'border-box' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || checkingNickname || !!errors.nickname}
                sx={{
                  width: '100%',
                  maxWidth: 400,
                  minHeight: 44,
                  py: { xs: 1.5, sm: 2 },
                  px: { xs: 4, sm: 8 },
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
                  },
                  borderRadius: 3,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : checkingNickname ? (
                  'Verificando...'
                ) : (
                  'Crear Cuenta'
                )}
              </Button>
            </Box>
          </form>

          <Box textAlign="center" mt={4}>
            <Typography variant="body1" color="text.secondary">
              ¿Ya tienes cuenta?{' '}
              <Link
                to="/login"
                style={{
                  color: '#8C4EFF',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Inicia sesión
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Register;
